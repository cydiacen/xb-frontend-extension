# XiaoBao One Enough

> 本插件还处于测试阶段，还存在许多bug。如果遇到问题欢迎issue or PR.

本插件适用于[校宝在线](http://www.xiaobaoonline.com/pc/index)前端人员的日常开发与维护，取名`OneEnough`也是本插件的一个期望，希望可以完善越来越多的功能，成为一个[校宝在线](http://www.xiaobaoonline.com/pc/index)前端开发的多面手。

GitHub:[https://github.com/cydiacen/xb-frontend-extension](https://github.com/cydiacen/xb-frontend-extension)

插件下载：[https://marketplace.visualstudio.com/items?itemName=cydiacen.xb-one-enough](https://marketplace.visualstudio.com/items?itemName=cydiacen.xb-one-enough)

## 安装方法
在vscode中 使用快捷键 `Ctrl+P`，然后输入命令：

`ext install xb-one-enough`

## 功能点

1. MarkDown 汉字统计

当初做这个功能只是为了了解下大概的`vsc`插件编写方案。官方的教程是计算英文字符数，稍加点自己的逻辑，就实现了统计中文字数。并且可以方便每次自己写完md文件，清楚的知道大概码了多少汉字。

2. 基于SIS前端文件架构的`component`属性提示。

于`2017年11月10日`添加了此功能，这个功能保留在我的ToDoList里很久了，一直没有时间去研究。

这个想法主要来自于日常开发时候对于他人编写的组件模块的不熟悉，总是频繁的在多个文件之中切换。本次只是初版，只是提供了对组件的属性提示，并且会显示bindings上备注的信息，方便了解各个属性的功能和用法，也可以直观的了解到哪些是非必要属性，接下来会再考虑更深入的添加些更加便利的功能。

使用方法：

在需要显示智能提示的组件行内,输入'-',出现的以`-`为开头的提示，就是组件所定义的属性。

3. 基于SIS前端架构的双语自动补充功能.  -- 2018-05-22 16:25:32

这个想法主要是来源于目前双语操作的繁琐与机械式体验,所以打算完成一个智能匹配当前操作文件的可能需要双语化的文案,并且自动生成语言包或在语言包内部添加字段.

使用方法:

1. `Ctrl/Command` + `Shift` + `P`,在调起的命令行输入框内输入`sis`
2. 选择对应的sis开头的功能
3. 如果文件内存在可能需要双语的文案,会出现一个多选框,可以勾选需要转换的文案之后点击确认或者敲回车.
4. 选择转换之后的代码形式,敲回车.
5. 当前页面对应的文案会自动包上双语的处理,并且会在当前文件所在的目录补充双语.




