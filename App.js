import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Button, TextInput } from "react-native";
import TcpSocket from "react-native-tcp-socket";
import Zeroconf from "react-native-zeroconf";
import FilePicker from "./FilePicker"; // 引入文件选择组件
import { Picker } from "@react-native-picker/picker";
import FileTransferServer from "./TcpServer";
import "react-native-get-random-values";
import FileTransferComponent from "./FileTransferComponent"


const { v4: uuidv4 } = require("uuid");
const uniqueId = uuidv4();
console.log(uniqueId);
const zeroconf = new Zeroconf();

export default function App() {
	const [services, setServices] = useState([]);
	const [selectedService, setSelectedService] = useState(null);
	const [file, setFile] = useState(null);
	const [text, setText] = useState(""); // 用于保存输入的文本

	useEffect(() => {
		// 扫描局域网服务
		zeroconf.scan("file");

		const onServiceFound = (service) => {
			setServices((prevServices) => {
				if (!prevServices.some((s) => s.name === service.name)) {
					return [...prevServices, service];
				}
				return prevServices;
			});
		};

		const onServiceLost = (service) => {
			setServices((prevServices) =>
				prevServices.filter((s) => s.name !== service.name)
			);
		};

		zeroconf.on("resolved", onServiceFound);
		zeroconf.on("removed", onServiceLost);

		return () => {
			zeroconf.stop();
			zeroconf.removeListener("resolved", onServiceFound);
			zeroconf.removeListener("removed", onServiceLost);
		};
	}, []);

	const handleServiceSelection = (serviceName) => {
		const selected = services.find((service) => service.name === serviceName);
		if (selected) {
			setSelectedService({
				name: selected.name,
				host: selected.host,
				port: selected.port,
			});
		}
	};

	const handleFileSelected = (file) => {
		setFile(file);
		console.log(" handleFileSelected", file.uri);
	};

	const sendTextToServer = () => {
		if (!text || !selectedService) {
			console.log("Text or service not selected");
			return;
		}

		console.log(
			"Connecting to server at",
			selectedService.host,
			"on port",
			selectedService.port
		);

		const socket = TcpSocket.createConnection(
			{ port: selectedService.port, host: selectedService.host },
			() => {
				console.log("Connected to server");

				// Send the text message to server
				socket.write(`TEXT_MESSAGE:${text}`);
				console.log("Text sent:", text);
			}
		);

		socket.on("data", (data) => {
			console.log("Server response:", data.toString());
		});

		socket.on("error", (error) => {
			console.log("Socket error:", error);
		});

		socket.on("close", () => {
			console.log("Connection closed");
		});
	};

	return (
		<View style={styles.container}>
			<FileTransferServer uuid={uniqueId} />
			<Text>Select and send file</Text>
			<FilePicker onFileSelected={handleFileSelected} />
			<Text>Selected file: {file ? file[0].name : "无"}</Text>

			<Text>Service discovery</Text>
			{services.length === 0 ? (
				<Text>No services discovered</Text>
			) : (
				<View>
					<Picker
						selectedValue={selectedService ? selectedService.name : null}
						onValueChange={(itemValue) => handleServiceSelection(itemValue)}
						style={{ height: 50, width: 200 }}
					>
						{services.map((service, index) => (
							<Picker.Item
								key={index}
								label={service.name}
								value={service.name}
							/>
						))}
					</Picker>
				</View>
			)}

			<TextInput
				style={styles.input}
				placeholder="Enter the text to send"
				value={text}
				onChangeText={setText}
			/>
			<Button title="Send text to server" onPress={sendTextToServer} />

			<FileTransferComponent
				selectedService={selectedService}
				file={file}
				onTransferProgress={(progress) => {
					// 可选：处理进度，例如更新UI
					console.log(`Enter the text to send: ${progress}%`);
				}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
	},
	input: {
		height: 40,
		borderColor: "gray",
		borderWidth: 1,
		marginBottom: 10,
		width: "80%",
		paddingLeft: 10,
	},
});
