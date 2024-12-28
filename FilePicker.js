import React from "react";
import { View, Button, Text } from "react-native";
import DocumentPicker from "react-native-document-picker";


const FilePicker = ({ onFileSelected }) => {
	// 选择文件并将其传递给父组件
	const handleFilePick = async () => {
		try {
			const res = await DocumentPicker.pick({
				type: [DocumentPicker.types.allFiles], // 你可以根据需要限制文件类型
			});

			// 传递文件信息给父组件
      onFileSelected(res);
      console.log(res.uri);

			console.log("File selected:", res);
		} catch (err) {
			if (DocumentPicker.isCancel(err)) {
				console.log("User cancelled the picker");
			} else {
				console.error("Error picking file", err);
			}
		}
	};

	return (
		<View>
			<Button title="Select file" onPress={handleFilePick} />
		</View>
	);
};

export default FilePicker;
