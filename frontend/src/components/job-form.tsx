'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { JobRequest } from '@/api/client'
import { useAgentStore } from '@/store/agent-store'

interface JobFormProps {
  onSubmit: (data: JobRequest) => void
  isLoading: boolean
}

export default function JobForm({ onSubmit, isLoading }: JobFormProps) {
  const { selectedModel, setSelectedModel } = useAgentStore()

  const [formData, setFormData] = useState<JobRequest>({
    title: 'AI Engineer',
    description: `Key Responsibilities

Develop and maintain reusable AI components, APIs and microservices
Support ML and GenAI architecture delivery including retrieval pipelines and agent workflows
Build capabilities for deployment, monitoring, evaluation and lifecycle management
Integrate AI services into enterprise environments aligned with standards
Collaborate with cross functional teams to deliver production grade AI solutions
Support experimentation and prototyping activities
Document patterns, best practices and procedures
Contribute to continuous improvement and knowledge sharing

Required Qualifications

Bachelor's degree in Computer Science, Engineering, AI or related discipline
2+ years' experience delivering AI or ML systems
Proficiency in Python
Experience with frameworks such as PyTorch, TensorFlow, Hugging Face or LangChain
Exposure to embedding models, vector stores or retrieval approaches
Cloud experience with AWS or Azure
Experience with Docker, Kubernetes, Terraform and CI/CD
Familiarity with data and platform engineering technologies including Snowflake, Kafka, S3, REST APIs or microservices
Experience with Git and Agile workflows

Skills & Competencies

Strong analytical and problem solving skills
Effective communication and documentation abilities
Stakeholder engagement and collaboration skills`,
    company_name: 'Pixta Vietnam',
    location: 'Vietnam',
  })

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Include selected model in the job data
    onSubmit({ ...formData, model_provider: selectedModel })
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
        <div className="w-12 h-12 bg-blue-900/20 border border-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
          🎯
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Initialize Recruitment</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm font-mono text-zinc-400 uppercase">System Ready for Input</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-2">Target Role Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-[#18181b] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm"
              placeholder="e.g. Senior Machine Learning Engineer"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-2">Company Identifier</label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-[#18181b] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm"
              placeholder="Your Company"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-2">LLM Model Provider</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-3 bg-[#18181b] border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm"
            >
              <option value="claude">Claude (Anthropic)</option>
              <option value="gemini">Gemini (Google)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-2">Location Parameters (Optional)</label>
            <input
              type="text"
              name="location"
              value={formData.location ?? ''}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-[#18181b] border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm"
              placeholder="e.g. San Francisco or Remote"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-2">Role Parameters / Job Description</label>
            <div className="relative">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={12}
                className="w-full px-4 py-4 bg-[#18181b] border border-zinc-700 rounded-lg text-gray-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-xs leading-relaxed resize-y"
                placeholder="Input full job description for analysis..."
              />
              <div className="absolute top-2 right-2 text-[10px] text-zinc-500 font-mono border border-zinc-800 px-2 py-0.5 rounded">
                MARKDOWN SUPPORTED
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-blue-500">ℹ</span>
            <span>Agents will analyze description for keyword extraction.</span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group relative px-8 py-3 bg-white text-black font-bold uppercase tracking-wider text-sm rounded hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-white/10"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isLoading ? 'INITIALIZING SWARM...' : 'DEPLOY AGENTS'}
            </span>
            {isLoading && <div className="absolute inset-0 bg-gray-300 w-full animate-pulse-slow" />}
          </button>
        </div>
      </form>
    </div>
  )
}

