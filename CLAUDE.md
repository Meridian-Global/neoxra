# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

Orchestra is a multi-agent content system that transforms one idea into platform-native content for Instagram, Threads, and LinkedIn.

The system is centered around a structured **Brief** object:
- A Planner agent turns a raw idea into a structured brief
- Platform agents use the brief to generate native content
- A Critic agent reviews all outputs against the creator's brand voice

The goal is to build a working MVP quickly, not a production-grade system.

## Current Goal

Build a usable MVP within 10 days that can:
1. Take one idea as input
2. Generate content for Instagram, Threads, and LinkedIn
3. Keep a visible record of agent collaboration
4. Be usable personally before adding publishing automation

## Development Priorities

Priority order:
1. CLI demo
2. Planner agent
3. Instagram / Threads / LinkedIn agents
4. Critic agent
5. Orchestrator
6. FastAPI endpoint
7. Frontend
8. Scheduling / publishing integrations

Do not overengineer early versions.

## Repository Structure

orchestra/
├── backend/
│   ├── agents/
│   │   ├── base.py
│   │   ├── planner.py
│   │   ├── instagram.py
│   │   ├── threads.py
│   │   ├── linkedin.py
│   │   └── critic.py
│   ├── core/
│   │   ├── brief.py
│   │   ├── orchestrator.py
│   │   └── voice_store.py
│   ├── api/
│   │   └── routes.py
│   ├── db/
│   │   └── models.py
│   └── voice/
│       └── default.yaml
├── frontend/
├── examples/
│   └── run_cli.py
├── docs/
├── .env
├── .env.example
└── README.md

## Core Architecture

### Brief Object
The Brief is the central object for a generation run.

It should contain:
- original idea
- core angle
- target audience
- tone
- per-platform notes

### Agent Roles

Planner → creates Brief  
Platform agents → generate content  
Critic → reviews outputs  

## Brand Voice

Defined in backend/voice/default.yaml

## Tech Stack

- Claude API
- Python
- FastAPI
- Next.js (later)
- SQLite (optional)
- YAML config

Avoid heavy frameworks.

## Coding Guidelines

- Keep code simple
- One agent per file
- Minimal dependencies
- Focus on working demo

## Commands

python examples/run_cli.py "your idea here"

## Notes

This is a fast prototype. Optimize for speed and iteration.
