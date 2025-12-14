import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import { Send, Star } from 'lucide-react'

export default function Feedback() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [type, setType] = useState<'bug' | 'feature' | 'improvement' | 'other'>('feature')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/feedback', {
        type,
        subject: subject.trim(),
        message: message.trim(),
        rating,
      })
      showToast('Thank you for your feedback!', 'success')
      setSubject('')
      setMessage('')
      setRating(null)
    } catch (error) {
      showToast('Failed to submit feedback. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass rounded-2xl shadow-soft-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-primary-400 mb-4">
            {t('feedback.title') || 'Send Feedback'}
          </h1>
          <p className="text-neutral-400 mb-8">
            {t('feedback.description') || 'We\'d love to hear your thoughts, suggestions, or report any issues.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Feedback Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['bug', 'feature', 'improvement', 'other'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setType(option)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      type === option
                        ? 'bg-primary-500 text-white'
                        : 'bg-ocean-700 text-neutral-300 hover:bg-ocean-600'
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Rating (Optional)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`transition-colors ${
                      rating && star <= rating
                        ? 'text-yellow-400'
                        : 'text-neutral-500 hover:text-yellow-400'
                    }`}
                  >
                    <Star className="w-6 h-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-ocean-800 border border-ocean-700 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Brief summary of your feedback"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Message *
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 rounded-lg bg-ocean-800 border border-ocean-700 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Please provide details about your feedback..."
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

