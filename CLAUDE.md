# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Vue 3 application called "MulmoChat" that provides a voice chat interface with OpenAI's GPT-4 Realtime API. The application includes image generation capabilities using Google's Gemini model.

## Key Commands

- **Development server**: `npm run dev`
- **Build for production**: `npm run build` 
- **Preview production build**: `npm run preview`

## Architecture

### Core Components

- **App.vue** (src/App.vue): Main component handling API key management, WebRTC connection to OpenAI Realtime API, and tool calling for image generation
- **generateImage.ts** (src/generateImage.ts): Image generation utility using Google Generative AI SDK

### Key Integration Points

The app integrates two AI services:
1. **OpenAI Realtime API**: Handles voice chat using WebRTC with tool calling support
2. **Google Gemini**: Generates images via the `generateImage` function tool

### Tool System

The app implements a tool calling system where the OpenAI model can call the `generateImage` tool:
- Tool definition sent via data channel in `response.create` message
- Tool calls handled in data channel message listener (App.vue:140)
- Images are generated asynchronously and displayed immediately in the DOM

### State Management

- API keys stored in localStorage with keys: `openai_api_key`, `gemini_api_key`
- System prompt stored in localStorage with key: `system_prompt`
- WebRTC connection state managed via reactive refs in App.vue

### WebRTC Flow

1. Creates RTCPeerConnection with data channel for model events
2. Sends `response.create` with system prompt and tool definitions
3. Handles microphone audio input and remote audio playback
4. Manages SDP offer/answer exchange with OpenAI API endpoint

## File Restrictions

- **Do not read src/plugins/blank.ts**: This file is too long and should be avoided when analyzing the codebase