# 题库数据结构规范 - v1.0（已确认）

**创建时间**: 2026-04-28
**状态**: ✅ 已确认，样本数据已生成

---

## 1. 成语库（idioms.json）

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 唯一标识，格式 idiom_xxx |
| word | string | ✅ | 成语原文 |
| pinyin | string | ✅ | 拼音 |
| meaning | string | ✅ | 释义 |
| example | string | ✅ | 例句 |
| difficulty | int | ✅ | 难度 1-5 |
| tags | array | ✅ | 标签（用于智能出题匹配） |

### 样本数据
- 已创建 30 条样本数据（difficulty 1-5）
- 文件：`/workspace/kidgame/data/idioms.json`

---

## 2. 古诗库（poems.json）

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 唯一标识，格式 poem_xxx |
| title | string | ✅ | 诗名 |
| author | string | ✅ | 作者 |
| dynasty | string | ✅ | 朝代 |
| content | array | ✅ | 诗句数组（每句一项） |
| difficulty | int | ✅ | 难度 1-5 |
| tags | array | ✅ | 标签 |

### 样本数据
- 已创建 20 条样本数据（唐诗宋词，difficulty 1-4）
- 文件：`/workspace/kidgame/data/poems.json`

---

## 3. 英语库（english.json）

### 字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | ✅ | 唯一标识，格式 eng_xxx |
| word | string | ✅ | 英文单词 |
| phonetic | string | ✅ | 音标 |
| meaning_cn | string | ✅ | 中文释义 |
| example | string | ✅ | 英文例句 |
| difficulty | int | ✅ | 难度 1-5 |
| level | string | ✅ | primary / middle |
| tags | array | ✅ | 标签 |

### 样本数据
- 已创建 30 条样本数据（primary + middle，difficulty 1-5）
- 文件：`/workspace/kidgame/data/english.json`

---

## 4. 智能出题要求

### 干扰项选择原则
1. **同标签优先**：从相同 tags 的题目中选干扰项
2. **同难度优先**：干扰项难度与被考题相近（±1）
3. **迷惑性**：干扰项要"看起来对"，不能明显错误

### 题型与数据映射

| 题型 | 使用字段 | 干扰项来源 |
|------|----------|------------|
| 看图猜成语（4选1） | word + meaning描述 | 同tag成语的word |
| 成语填空 | word + example | 同tag成语的word |
| 成语释义选择 | meaning + word | 同tag成语的meaning |
| 诗句补全 | content + title | 同诗人/同tag诗句 |
| 诗人配对 | author + title | 同时代诗人 |
| 诗句释义 | content + meaning | 同tag诗句的meaning |
| 看图选词（4选1） | word + meaning_cn | 同tag英文单词 |
| 单词释义选择 | meaning_cn + word | 同tag单词的word |
| 单词拼写 | word + meaning_cn | 字符相似的单词 |

---
*文档版本: v1.0（已确认）| 最后更新: 2026-04-28*
