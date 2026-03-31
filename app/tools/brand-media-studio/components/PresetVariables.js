'use client'

import { useState, useEffect } from 'react'

export default function PresetVariables({ variables, promptTemplate, onPromptChange }) {
  const [values, setValues] = useState({})

  useEffect(() => {
    if (!variables?.length || !promptTemplate) return
    let result = promptTemplate
    variables.forEach(v => {
      const val = values[v.key] || ''
      result = result.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), val)
    })
    result = result.replace(/\s+/g, ' ').trim()
    onPromptChange(result)
  }, [values, promptTemplate, variables])

  if (!variables?.length) return null

  const updateValue = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div style={{
      background: 'var(--color-background-secondary, #f8f8f6)',
      borderRadius: 10,
      padding: '16px',
      marginBottom: '16px',
      border: '0.5px solid var(--color-border-tertiary, #e8e8e4)',
    }}>
      <div style={{
        fontSize: '11px', fontWeight: '500',
        color: 'var(--color-text-secondary, #888)',
        textTransform: 'uppercase', letterSpacing: '.05em',
        marginBottom: '12px',
      }}>
        Wypełnij szczegóły presetu
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {variables.map(v => (
          <div key={v.key}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, #666)', marginBottom: '4px' }}>
              {v.label}
              {v.required && <span style={{ color: '#b8763a', marginLeft: '3px' }}>*</span>}
            </div>
            <input
              type="text"
              value={values[v.key] || ''}
              onChange={e => updateValue(v.key, e.target.value)}
              placeholder={v.placeholder}
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '0.5px solid var(--color-border-secondary, #ddd)',
                borderRadius: '6px',
                background: 'var(--color-background-primary, #fff)',
                color: 'var(--color-text-primary, #1a1a1a)',
                fontSize: '13px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '12px',
        padding: '8px 12px',
        background: 'var(--color-background-primary, #fff)',
        borderRadius: '6px',
        border: '0.5px solid var(--color-border-tertiary, #e8e8e4)',
        borderLeft: '2px solid #b8763a',
      }}>
        <div style={{ fontSize: '10px', color: '#b8763a', fontWeight: '500', marginBottom: '4px' }}>
          Podgląd promptu
        </div>
        <div style={{
          fontSize: '11px', color: 'var(--color-text-secondary, #888)',
          lineHeight: '1.5', fontStyle: 'italic',
        }}>
          {(() => {
            let preview = promptTemplate || ''
            variables.forEach(v => {
              const val = values[v.key]
              if (val) {
                preview = preview.replace(
                  new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'),
                  `[${val}]`
                )
              }
            })
            return preview.slice(0, 200) + (preview.length > 200 ? '...' : '')
          })()}
        </div>
      </div>
    </div>
  )
}
