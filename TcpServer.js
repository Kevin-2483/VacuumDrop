import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import Zeroconf from "react-native-zeroconf";
import RNFS from "react-native-fs";
import { Buffer } from "buffer";

const FileTransferServer = ({ uuid }) => {
	const [signalMessage, setSignalMessage] = useState("");
	const [server, setServer] = useState(null);
	const [clients, setClients] = useState([]);
	const [SERVER_PORT, setSERVER_PORT] = useState(1234);

	useEffect(() => {
		const zeroconf = new Zeroconf();
		const downloadDir = RNFS.DownloadDirectoryPath;

		const serverInstance = TcpSocket.createServer((socket) => {
			console.log("客户端已连接:", socket.address());
			setClients((prevClients) => [...prevClients, socket]);

			// 文件传输状态
			let metadataReceived = false;
			let fileMetadata = null;
			let fileBuffer = Buffer.alloc(0);
			let expectedFileSize = 0;

			socket.on("data", (data) => {
				const dataStr = data.toString();

				// 处理文件传输元数据
				if (dataStr.startsWith("FILE_TRANSFER:")) {
					try {
						const metadataParts = dataStr.split(":");
						const metadataLength = parseInt(metadataParts[1]);
						const metadataJson = metadataParts
							.slice(2)
							.join(":")
							.slice(0, metadataLength);
						fileMetadata = JSON.parse(metadataJson);

						console.log("接收到文件元数据:", fileMetadata);
						expectedFileSize = fileMetadata.fileSize;
						metadataReceived = true;

						// 重置文件缓冲区
						fileBuffer = Buffer.alloc(0);
					} catch (error) {
						console.error("解析元数据错误:", error);
						socket.write("FILE_TRANSFER_ERROR: 元数据解析失败");
					}
					return;
				}

				// 处理文件内容
				if (metadataReceived) {
					// 累积文件内容
					fileBuffer = Buffer.concat([fileBuffer, data]);

					// 检查是否为文件传输结束标记
					if (dataStr === "FILE_TRANSFER_END") {
						const fullFilePath = `${downloadDir}/${fileMetadata.fileName}`;

						// 将文件写入存储
						RNFS.writeFile(
							fullFilePath,
							fileBuffer.toString("base64"),
							"base64"
						)
							.then(() => {
								console.log(`文件 ${fileMetadata.fileName} 保存成功`);
								socket.write("FILE_TRANSFER_ACK");

								// 可选：发送桌面通知
								Alert.alert(
									"文件传输",
									`文件 ${fileMetadata.fileName} 已成功接收`
								);
							})
							.catch((error) => {
								console.error("文件保存错误:", error);
								socket.write("FILE_TRANSFER_ERROR: 文件保存失败");
							})
							.finally(() => {
								// 重置状态
								metadataReceived = false;
								fileMetadata = null;
								fileBuffer = Buffer.alloc(0);
							});
					}
				} else if (dataStr.startsWith("TEXT_MESSAGE:")) {
					// 处理文本消息
					const message = dataStr.replace("TEXT_MESSAGE:", "");
					console.log("收到文本消息:", message);
					setSignalMessage(message);
					socket.write(`收到消息: ${message}`);
				}
			});

			// 错误处理
			socket.on("error", (error) => {
				console.error("套接字错误:", error);
				setClients((prevClients) =>
					prevClients.filter((clientSocket) => clientSocket !== socket)
				);
			});

			socket.on("close", (hadError) => {
				console.log("客户端连接关闭", hadError);
				setClients((prevClients) =>
					prevClients.filter((clientSocket) => clientSocket !== socket)
				);
			});
		});

		// 启动服务器监听
		serverInstance.listen({ port: SERVER_PORT, host: "0.0.0.0" }, () => {
			console.log(`服务器启动于 0.0.0.0:${SERVER_PORT}`);

			// 发布 Zeroconf 服务
			try {
				zeroconf.publishService(
					"file",
					"tcp",
					"local.",
					`FileServer-${uuid}`,
					SERVER_PORT,
					{}
				);
				console.log("发布服务:", `FileServer-${uuid}`);
			} catch (error) {
				console.error("Zeroconf服务注册错误:", error);
			}
		});

		// 服务器错误处理
		serverInstance.on("error", (error) => {
			console.error("服务器错误:", error);
			if (error === "bind failed: EADDRINUSE (Address already in use)") {
				setSERVER_PORT((prevPort) => prevPort + 1);
			}
		});

		setServer(serverInstance);

		// 清理函数
		return () => {
			if (server) {
				server.close();
			}
			zeroconf.stop();
			clients.forEach((socket) => socket.destroy());
		};
	}, [SERVER_PORT]);

	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
			<Text>服务器运行中</Text>
			<Text>
				端口: {SERVER_PORT} UUID: {uuid}
			</Text>
			<Text>已连接客户端: {clients.length}</Text>
			<Text>最后信号: {signalMessage}</Text>
		</View>
	);
};

export default FileTransferServer;
