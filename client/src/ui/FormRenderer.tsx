import { useState } from 'react';
import { isFieldVisible, validateAnswers, type Field } from '@fieldsync/shared';

type Answers = Record<string, unknown>;
type Props = {
  fields: Field[];
  initialAnswers?: Answers;
  submitLabel: string;
  onSubmit: (answers: Answers) => Promise<void>;
  onCancel?: () => void;
};

export default function FormRenderer({ fields, initialAnswers = {}, submitLabel, onSubmit, onCancel }: Props) {
  const [answers, setAnswers] = useState<Answers>({ ...initialAnswers });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const visibleFields = fields.filter(field => isFieldVisible(field, answers));
  const answered = visibleFields.filter(field => {
    const value = answers[field.id];
    return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
  }).length;
  const set = (id: string, value: unknown) => setAnswers(current => ({ ...current, [id]: value }));
  const captureGps = (id: string) => {
    if (!navigator.geolocation) return setError('Location is not available in this browser.');
    navigator.geolocation.getCurrentPosition(
      position => { set(id, { lat: position.coords.latitude, lng: position.coords.longitude }); setAccuracy(position.coords.accuracy); setError(''); },
      () => setError('Could not get location. Check permission and try again.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const reasons = validateAnswers(fields, answers);
    if (reasons.length) return setError(reasons.join(' · '));
    setError(''); setSaving(true);
    try { await onSubmit(answers); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this response.'); }
    finally { setSaving(false); }
  }

  return <form className="field-form" onSubmit={event => { void submit(event); }}>
    <div className="form-progress"><div><strong>Survey progress</strong><span>{answered} of {visibleFields.length} answered</span></div><div className="progress-track"><i style={{width:`${visibleFields.length ? answered / visibleFields.length * 100 : 0}%`}}/></div></div>
    {visibleFields.map(field => {
      const value = answers[field.id];
      const required = field.required;
      return <label key={field.id}>{field.label}
        {field.type === 'text' && <input aria-label={field.label} value={String(value ?? '')} required={required} onChange={event => set(field.id, event.target.value)} />}
        {field.type === 'number' && <input aria-label={field.label} type="number" min={field.min} max={field.max} value={value === undefined || value === null ? '' : String(value)} required={required} onChange={event => set(field.id, event.target.value === '' ? '' : Number(event.target.value))} />}
        {field.type === 'date' && <input aria-label={field.label} type="date" value={String(value ?? '')} required={required} onChange={event => set(field.id, event.target.value)} />}
        {field.type === 'single_choice' && <select aria-label={field.label} value={String(value ?? '')} required={required} onChange={event => set(field.id, event.target.value)}><option value="">Choose…</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>}
        {field.type === 'multiple_choice' && <span>{field.options?.map(option => <span key={option} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input aria-label={option} type="checkbox" style={{ width: 'auto' }} checked={Array.isArray(value) && value.includes(option)} onChange={event => { const current = Array.isArray(value) ? (value as string[]).filter(item => field.options?.includes(item)) : []; set(field.id, event.target.checked ? [...current, option] : current.filter(item => item !== option)); }} />{option}</span>)}</span>}
        {field.type === 'gps' && <><small className="field-hint">Capture the current coordinates or enter them as latitude, longitude.</small><input aria-label={field.label} placeholder="latitude, longitude" value={typeof value === 'object' && value !== null ? `${(value as any).lat}, ${(value as any).lng}` : String(value ?? '')} required={required} onChange={event => { const [latText, lngText] = event.target.value.split(',').map(item => item.trim()); const lat = Number(latText), lng = Number(lngText); set(field.id, latText !== '' && lngText !== '' && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : event.target.value); }} /><button type="button" className="btn secondary gps-button" onClick={() => captureGps(field.id)}>⌖ Capture location</button>{typeof value === 'object' && value !== null && <div className="gps-preview"><span>◎</span><div><strong>Location captured</strong><small>{Number((value as any).lat).toFixed(5)}, {Number((value as any).lng).toFixed(5)}{accuracy !== null ? ` · ±${Math.round(accuracy)} m` : ''}</small></div></div>}</>}
      </label>;
    })}
    {error && <p role="alert" className="error">{error}</p>}
    <div className="form-actions"><button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>{onCancel && <button className="btn secondary" type="button" onClick={onCancel}>Cancel edit</button>}</div>
  </form>;
}
