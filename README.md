# 法语动词默写

本地优先的法语动词变位默写网站。第一版支持自定义动词库、常规整表练习、考试模式、符号宽容判分、标准答案醒目显示和当前页面重做。

## 运行

```bash
node server.js
```

然后打开：

```text
http://localhost:8765
```

## 测试

```bash
node --test
node --check server.js
node --check api/fayu-assistant.js
node --check src/app.js
node --check src/conjugation.js
node --check src/fayuAssistant.js
node --check src/verbData.js
```

## 部署成公网网站

这个项目已经可以部署到 Vercel 这类支持静态站点和 Node API 路由的平台。

Vercel 部署时会：

- 直接托管 `index.html`、`src/` 和样式文件。
- 使用 `api/fayu-assistant.js` 作为公网 API：`/api/fayu-assistant?verb=recevoir`。
- 保持动词库保存在每个用户自己的浏览器 `localStorage` 里。

如果需要所有人共享同一个云端动词库，需要再接数据库；当前版本是“同一个网站地址，各自本地词库”。

## 说明

- 动词库保存在当前浏览器的 `localStorage`。
- 添加动词时只通过本地服务读取法语助手变位页并回填表格；自动读取失败时可以打开法语助手核对页或手动填写后保存。
- 判分会忽略 accent、cédille、撇号和空格差异，但字母和词尾必须正确。
- 标准答案始终以完整法语符号形式显示。
