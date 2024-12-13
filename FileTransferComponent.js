import React, { useState } from "react";
import { View, Text, Button, StyleSheet, Alert } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import RNFS from "react-native-fs";

const FileTransferComponent = ({
	selectedService,
	file,
	onTransferProgress,
}) => {
	const [transferStatus, setTransferStatus] = useState("");

	const sendFileToServer = async () => {
		if (!file || !selectedService) {
			Alert.alert("错误", "请选择文件和服务");
			return;
		}

		try {
			// 处理文件数组的情况
      const fileToTransfer = Array.isArray(file) ? file[0] : file;
      console.log("file", fileToTransfer.uri);

			// 详细日志：目标服务信息
			console.log("目标服务详情:", {
				host: selectedService.host,
				port: selectedService.port,
			});

      // 读取文件信息
      const correctedUri = fileToTransfer.uri.replace("file://", "content://");
      console.log("correctedUri", correctedUri);
      const fileStats = await RNFS.stat(correctedUri);
      

			// 详细日志：文件信息
			console.log("文件详细信息:", {
				uri: fileToTransfer.uri,
				name: fileStats.name,
				size: fileStats.size,
				type: fileToTransfer.type || "未知类型",
				path: fileStats.path,
				originalName: fileStats.originalname,
			});

			const fileName = fileStats.name;
			const fileSize = fileStats.size;

			// 读取文件内容（base64编码）
			const fileContent = await RNFS.readFile(correctedUri, "base64");

			// 日志：文件内容长度
			console.log(`文件内容长度: ${fileContent.length} 字节`);

			const socket = TcpSocket.createConnection(
				{
					port: selectedService.port,
					host: selectedService.host,
				},
				() => {
					// 发送文件元数据
					const metadata = JSON.stringify({
						fileName: fileName,
						fileSize: fileSize,
						fileType: fileToTransfer.type || "application/octet-stream",
					});

					// 日志：元数据信息
					console.log("发送文件元数据:", metadata);

					// 发送文件传输协议头
					socket.write(`FILE_TRANSFER:${metadata.length}:${metadata}`);

					// 分块发送文件
					const CHUNK_SIZE = 4096; // 4KB分块
					let transferredBytes = 0;

					for (let i = 0; i < fileContent.length; i += CHUNK_SIZE) {
						const chunk = fileContent.slice(i, i + CHUNK_SIZE);
						socket.write(chunk);

						// 计算并报告传输进度
						transferredBytes += chunk.length;
						const progress = (transferredBytes / fileSize) * 100;

						// 日志：传输进度
						console.log(
							`传输进度: ${progress.toFixed(
								2
							)}%, 已传输: ${transferredBytes}/${fileSize} 字节`
						);

						onTransferProgress(progress);
						setTransferStatus(`传输中: ${progress.toFixed(2)}%`);
					}

					// 发送传输结束标记
					socket.write("FILE_TRANSFER_END");
					console.log("文件传输结束标记已发送");
					setTransferStatus("传输完成");
				}
			);

			socket.on("data", (data) => {
				// 安全地处理数据
				if (data) {
					const response = data.toString("utf8");
					console.log("服务器响应:", response);

					if (response.includes("FILE_TRANSFER_ACK")) {
						setTransferStatus("文件传输成功");
						console.log("服务器确认文件传输成功");
					} else if (response.includes("FILE_TRANSFER_ERROR")) {
						setTransferStatus("服务器处理文件出错");
						console.error("服务器报告文件传输错误");
					}
				}
			});

			socket.on("error", (error) => {
				console.error("Socket连接错误:", {
					errorMessage: error.message,
					errorCode: error.code,
				});
				setTransferStatus(`传输失败: ${error.message}`);
				Alert.alert("传输错误", error.message);
			});

			socket.on("close", (hadError) => {
				console.log(`连接关闭, 是否有错误: ${hadError}`);
			});
		} catch (error) {
			// 详细错误日志
			console.error("文件传输完整错误信息:", {
				message: error.message,
				stack: error.stack,
				code: error.code,
			});

			setTransferStatus(`错误: ${error.message}`);
			Alert.alert("错误", `无法读取文件: ${error.message}`);
		}
	};

	return (
		<View style={styles.container}>
			<Button
				title="发送文件"
				onPress={sendFileToServer}
				disabled={!file || !selectedService}
			/>
			<Text style={styles.statusText}>{transferStatus}</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		marginVertical: 10,
	},
	statusText: {
		marginTop: 10,
		color: "#666",
	},
});

export default FileTransferComponent;
