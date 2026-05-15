import type { Preset, PresetDomain } from '../nodes/types'

const blogPostDrafter: Preset = {
  id: 'blog-post-drafter',
  name: 'Blog Post Drafter',
  nameKey: 'presets.blogPostDrafter.name',
  domain: 'writing',
  description:
    'Turn a topic into a fully drafted blog post via outline expansion and full prose generation.',
  descriptionKey: 'presets.blogPostDrafter.description',
  flow: {
    id: 'flow-blog-post-drafter',
    name: 'Blog Post Drafter',
    phase: 0,
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    nodes: [
      {
        id: 'n1',
        type: 'input',
        label: 'Topic',
        position: { x: 60, y: 200 },
        params: { value: '' },
        preset: 'blog-post-drafter',
      },
      {
        id: 'n2',
        type: 'llm',
        label: 'Expand Outline',
        position: { x: 320, y: 200 },
        params: {
          model: 'llama3',
          temperature: 0.7,
          max_tokens: 1024,
          system:
            'You are an expert content strategist. Given a blog topic, generate a detailed section-by-section outline with 5-7 sections, each including a heading and 2-3 bullet points of key ideas to cover. Output only the outline.',
        },
        preset: 'blog-post-drafter',
      },
      {
        id: 'n3',
        type: 'llm',
        label: 'Write Full Draft',
        position: { x: 580, y: 200 },
        params: {
          model: 'llama3',
          temperature: 0.7,
          max_tokens: 1024,
          system:
            'You are a skilled blog writer. Given a structured outline, write a complete, engaging blog post with a compelling introduction, fully developed body sections, and a clear conclusion. Use a conversational yet authoritative tone. Output only the finished prose.',
        },
        preset: 'blog-post-drafter',
      },
      {
        id: 'n4',
        type: 'display',
        label: 'Result',
        position: { x: 840, y: 200 },
        params: {},
        preset: 'blog-post-drafter',
      },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', sourceHandle: 'source', target: 'n2', targetHandle: 'target' },
      { id: 'e2-3', source: 'n2', sourceHandle: 'source', target: 'n3', targetHandle: 'target' },
      { id: 'e3-4', source: 'n3', sourceHandle: 'source', target: 'n4', targetHandle: 'target' },
    ],
  },
}

const lessonPlanBuilder: Preset = {
  id: 'lesson-plan-builder',
  name: 'Lesson Plan Builder',
  nameKey: 'presets.lessonPlanBuilder.name',
  domain: 'education',
  description:
    'Generate measurable learning objectives and a complete lesson plan from a subject and grade level.',
  descriptionKey: 'presets.lessonPlanBuilder.description',
  flow: {
    id: 'flow-lesson-plan-builder',
    name: 'Lesson Plan Builder',
    phase: 0,
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    nodes: [
      {
        id: 'n1',
        type: 'input',
        label: 'Subject + Grade Level',
        position: { x: 60, y: 200 },
        params: { value: '' },
        preset: 'lesson-plan-builder',
      },
      {
        id: 'n2',
        type: 'llm',
        label: 'Generate Learning Objectives',
        position: { x: 320, y: 200 },
        params: {
          model: 'llama3',
          temperature: 0.7,
          max_tokens: 1024,
          system:
            "You are a curriculum designer with expertise in Bloom's Taxonomy. Given a subject and grade level, produce 4-6 specific, measurable, achievable, relevant, and time-bound (SMART) learning objectives. Each objective should start with an action verb and be appropriate for the stated grade level. Output only the numbered list of objectives.",
        },
        preset: 'lesson-plan-builder',
      },
      {
        id: 'n3',
        type: 'llm',
        label: 'Build Lesson Plan',
        position: { x: 580, y: 200 },
        params: {
          model: 'llama3',
          temperature: 0.7,
          max_tokens: 1024,
          system:
            'You are an experienced educator. Given a set of learning objectives, build a structured lesson plan including: duration estimate, required materials, warm-up activity (5 min), direct instruction (15 min), guided practice (15 min), independent practice (10 min), and a closing assessment strategy. Format each section with a clear heading and concise description.',
        },
        preset: 'lesson-plan-builder',
      },
      {
        id: 'n4',
        type: 'display',
        label: 'Lesson Plan',
        position: { x: 840, y: 200 },
        params: {},
        preset: 'lesson-plan-builder',
      },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', sourceHandle: 'source', target: 'n2', targetHandle: 'target' },
      { id: 'e2-3', source: 'n2', sourceHandle: 'source', target: 'n3', targetHandle: 'target' },
      { id: 'e3-4', source: 'n3', sourceHandle: 'source', target: 'n4', targetHandle: 'target' },
    ],
  },
}

const meetingSummary: Preset = {
  id: 'meeting-summary',
  name: 'Meeting Summary',
  nameKey: 'presets.meetingSummary.name',
  domain: 'business',
  description:
    'Extract action items and produce a professional meeting summary from raw meeting notes.',
  descriptionKey: 'presets.meetingSummary.description',
  flow: {
    id: 'flow-meeting-summary',
    name: 'Meeting Summary',
    phase: 0,
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    nodes: [
      {
        id: 'n1',
        type: 'input',
        label: 'Raw Meeting Notes',
        position: { x: 60, y: 200 },
        params: { value: '' },
        preset: 'meeting-summary',
      },
      {
        id: 'n2',
        type: 'llm',
        label: 'Extract Action Items',
        position: { x: 320, y: 200 },
        params: {
          model: 'llama3',
          temperature: 0.7,
          max_tokens: 1024,
          system:
            'You are a meticulous business analyst. Given raw meeting notes, identify and extract every action item, decision made, and open question. Format each action item as: \'- [Owner] Action description (Due: date if mentioned)\'. Group under headings: Action Items, Decisions Made, Open Questions. Be comprehensive — do not omit any commitment or follow-up.',
        },
        preset: 'meeting-summary',
      },
      {
        id: 'n3',
        type: 'llm',
        label: 'Format as Summary',
        position: { x: 580, y: 200 },
        params: {
          model: 'llama3',
          temperature: 0.7,
          max_tokens: 1024,
          system:
            'You are a professional executive assistant. Given extracted action items, decisions, and open questions from a meeting, produce a polished meeting summary memo. Include: a one-paragraph executive summary, the structured action items and decisions sections, and a next-steps paragraph. Use professional business language suitable for sharing with stakeholders.',
        },
        preset: 'meeting-summary',
      },
      {
        id: 'n4',
        type: 'display',
        label: 'Meeting Summary',
        position: { x: 840, y: 200 },
        params: {},
        preset: 'meeting-summary',
      },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', sourceHandle: 'source', target: 'n2', targetHandle: 'target' },
      { id: 'e2-3', source: 'n2', sourceHandle: 'source', target: 'n3', targetHandle: 'target' },
      { id: 'e3-4', source: 'n3', sourceHandle: 'source', target: 'n4', targetHandle: 'target' },
    ],
  },
}

const imageGenBasic: Preset = {
  id: 'image-gen-basic',
  name: 'Image Gen Basic',
  nameKey: 'presets.imageGenBasic.name',
  domain: 'image',
  description:
    'Format a prompt and style description into a ComfyUI-compatible job payload and dispatch it.',
  descriptionKey: 'presets.imageGenBasic.description',
  flow: {
    id: 'flow-image-gen-basic',
    name: 'Image Gen Basic',
    phase: 0,
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    nodes: [
      {
        id: 'n1',
        type: 'input',
        label: 'Prompt + Style',
        position: { x: 60, y: 200 },
        params: { value: '' },
        preset: 'image-gen-basic',
      },
      {
        id: 'n2',
        type: 'transform',
        label: 'Format ComfyUI Payload',
        position: { x: 320, y: 200 },
        params: {
          template: '{"prompt": "{{input}}", "style": "photorealistic"}',
        },
        preset: 'image-gen-basic',
      },
      {
        id: 'n3',
        type: 'output',
        label: 'ComfyUI Job',
        position: { x: 580, y: 200 },
        params: {},
        preset: 'image-gen-basic',
      },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', sourceHandle: 'source', target: 'n2', targetHandle: 'target' },
      { id: 'e2-3', source: 'n2', sourceHandle: 'source', target: 'n3', targetHandle: 'target' },
    ],
  },
}

export const PRESETS: Preset[] = [
  blogPostDrafter,
  lessonPlanBuilder,
  meetingSummary,
  imageGenBasic,
]

export function getPresetsByDomain(domain: PresetDomain): Preset[] {
  return PRESETS.filter((p) => p.domain === domain)
}

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id)
}
