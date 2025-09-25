# Live2D 模型配置说明

## 如何添加本地模型

1. 在 `model/` 目录下创建模型文件夹，例如：`shizuku/`
2. 将你的Live2D模型文件（包括.model.json、.moc、.png等）上传到对应的文件夹中
3. 确保模型的主配置文件为 `.model.json` 格式
4. 在 `waifu-tips.json` 文件中的 `model` 数组中添加你的模型配置

## 模型配置格式

```json
{
  "name": "your_model_name",
  "displayName": "显示名称",
  "path": "model/your_model_folder/your_model.model.json"
}
```

## 注意事项

- 确保模型文件路径与配置中的 `path` 字段匹配
- 模型文件应该包含所有必要的资源文件（贴图、moc文件等）
- 建议使用相对路径，从 `waifu-tips.json` 文件所在目录开始计算

## 示例

如果你有一个名为 `reimu` 的模型，文件结构应该是：

```
model/
├── reimu/
│   ├── reimu.model.json
│   ├── reimu.moc
│   ├── textures/
│   │   ├── reimu.1024/texture_00.png
│   │   └── ...
│   └── motions/
│       └── ...
└── README.md
```

然后在 `waifu-tips.json` 中添加：

```json
{
  "name": "reimu",
  "displayName": "Reimu",
  "path": "model/reimu/reimu.model.json"
}
```
