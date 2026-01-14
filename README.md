# Neon Othello

Neon Othelloは、ネオン風のビジュアルエフェクトを備えたオセロゲームのWebアプリケーションです。React + TypeScript + Viteで構築されており、Docker Composeを使用して簡単に起動できます。

## アプリケーション概要

- **ゲーム名**: Neon Othello
- **技術スタック**: React 19, TypeScript, Vite
- **特徴**:
  - ネオン風のビジュアルエフェクト
  - リアルタイムのスコア表示
  - ゲーム終了時の勝敗判定
  - アニメーション効果

## 必要な環境

- Docker
- Docker Compose

## 起動方法

### 1. リポジトリのクローン（必要な場合）

```bash
git clone <repository-url>
cd skillversi
```

### 2. Docker Composeで起動

```bash
docker-compose up
```

初回起動時は、依存関係のインストールとビルドが自動的に実行されます。

### 3. ブラウザでアクセス

起動後、以下のURLでアプリケーションにアクセスできます：

```
http://localhost:8000
```

## 操作方法

1. **ゲーム開始**: アプリケーションを開くと、自動的にゲームが開始されます
2. **石を置く**: 配置可能なマス（点滅しているマス）をクリックして石を置きます
3. **ターン交代**: 黒と白が交互に手番を進めます
4. **ゲーム終了**: どちらかのプレイヤーが置ける場所がなくなると、ゲームが終了します
5. **再プレイ**: ゲーム終了後、「PLAY AGAIN」ボタンをクリックして新しいゲームを開始できます

## 開発

### ローカル開発環境での起動

Dockerを使用せずにローカルで開発する場合：

```bash
npm install
npm run dev
```

### ビルド

本番用のビルドを作成する場合：

```bash
npm run build
```

### プレビュー

ビルドしたアプリケーションをプレビューする場合：

```bash
npm run preview
```

## プロジェクト構成

```
skillversi/
├── src/
│   ├── components/      # Reactコンポーネント
│   │   ├── Board.tsx   # ゲームボード
│   │   ├── Disc.tsx    # 石のコンポーネント
│   │   └── VFXLayer.tsx # ビジュアルエフェクト
│   ├── hooks/
│   │   └── useOthello.ts # オセロゲームのロジック
│   └── utils/
│       └── gameLogic.ts  # ゲームルールの実装
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## ライセンス

このプロジェクトはプライベートプロジェクトです。
