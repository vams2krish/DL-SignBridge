import { useEffect, useRef, useState } from 'react';
import { BookOpen, Download, Hand, Plus, Square, Trash2, Upload } from 'lucide-react';
import { exportVocabulary, importVocabulary, MAX_SAMPLES, MIN_SAMPLES } from './personal';
import type { VocabularyController } from './useVocabulary';

type Props={controller:VocabularyController;live:boolean;prompt:string;onSaved:()=>void;onPreview:(id:string)=>void};
export default function PersonalTrainer({controller:c,live,prompt,onSaved,onPreview}:Props){
  const [name,setName]=useState(''),[phrase,setPhrase]=useState('');
  const [error,setError]=useState('');const upload=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(prompt){setName(prompt);setPhrase(prompt);}},[prompt]);
  useEffect(()=>{if(!live)c.cancel();},[live,c.cancel]);
  async function importFile(file?:File){
    if(!file)return;
    try{
      if(file.size>12*1024*1024)throw new Error('Choose a vocabulary file under 12 MB.');
      const loaded=importVocabulary(await file.text());
      const merged=[...c.items.filter(g=>!loaded.some(x=>x.id===g.id)),...loaded];
      if(merged.length>200||new Set(merged.map(g=>g.phrase.toLowerCase())).size!==merged.length)throw new Error('Import would exceed 200 gestures or duplicate a phrase.');
      c.cancel();c.setItems(merged);c.setMessage(`Imported ${loaded.length} personal gestures. Test them on this device before use.`);setError('');
    }catch(e){setError(e instanceof Error?e.message:'Could not import vocabulary.');}
    if(upload.current)upload.current.value='';
  }
  function download(){
    const url=URL.createObjectURL(new Blob([exportVocabulary(c.items)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='signbridge-personal-vocabulary.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="learning-panel panel" id="personal-learning" aria-labelledby="learning-title">
    <div className="panel-header"><div><span className="step">03</span><h2 id="learning-title">Teach your own gestures</h2></div><span className="small-tag">{c.items.length} / 200 PERSONAL POSES</span></div>
    <div className="learning-body"><div className="learning-intro"><BookOpen size={23}/><div><strong>Your vocabulary. Your way.</strong><p>Learn an ISL sign from a qualified signer or the official dictionary, then teach a distinct <b>static hand pose</b>. The learner matches your examples; it does not learn motion, body position, facial grammar, or full ISL.</p></div></div>
      <ol className="learning-steps"><li>Enable the camera above. Choose one or two hands in Studio settings.</li><li>Keep the whole pose visible. Capture 12–24 snapshots while varying the angle slightly.</li><li>Save, switch to Personal recognition, and test again with a fresh pose. Similar poses may be rejected.</li></ol>
      <div className="learning-fields"><label>Gesture name<input aria-label="Personal gesture name" maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. My water pose"/></label><label>Caption / spoken phrase<input aria-label="Personal spoken phrase" maxLength={200} value={phrase} onChange={e=>setPhrase(e.target.value)} placeholder="e.g. I would like water"/></label></div>
      <div className="learning-actions"><button className="secondary" disabled={!live||c.collecting||!name.trim()||!phrase.trim()} onClick={()=>{setError('');c.start();}}><Hand size={16}/> Capture pose examples</button>{c.collecting&&<button className="secondary" onClick={c.cancel}><Square size={14}/> Pause capture</button>}<span className="capture-count" aria-live="polite">{c.count} / {MAX_SAMPLES} snapshots</span><button className="primary" disabled={c.collecting||c.count<MIN_SAMPLES} onClick={()=>{try{c.save(name,phrase);setError('');onSaved();}catch(e){setError(e instanceof Error?e.message:'Could not save gesture.');}}}><Plus size={15}/> Save learned gesture</button></div>
      {!live&&<p className="training-hint">Enable live camera to capture examples. Sample photos are not training captures.</p>}
      <progress aria-label="Personal pose capture progress" max={MAX_SAMPLES} value={c.count}/>
      <p className="training-message" role="status">{c.message||'Nothing is saved automatically. Your learned landmarks stay in this tab until you export them.'}</p>{error&&<p className="error-box" role="alert">{error}</p>}
      <div className="vocabulary-tools"><button className="secondary" disabled={!c.items.length} onClick={download}><Download size={14}/> Export vocabulary</button><button className="secondary" onClick={()=>upload.current?.click()}><Upload size={14}/> Import vocabulary</button><input ref={upload} hidden type="file" accept="application/json,.json" aria-label="Import personal vocabulary file" onChange={e=>void importFile(e.target.files?.[0])}/><button className="secondary" disabled={!c.items.length} onClick={c.clear}><Trash2 size={14}/> Clear learned vocabulary</button></div>
      <p className="training-hint">Exports contain hand coordinates and labels, not photos. Treat them as personal data. Clearing conversation history does not delete your learned vocabulary.</p>
      {!!c.items.length&&<div className="personal-list">{c.items.map(g=><article key={g.id}><div><strong>{g.name}</strong><p>{g.phrase} · {g.pose.length} hand{g.pose.length===1?'':'s'} · {g.samples.length} examples</p></div><button className="secondary" onClick={()=>onPreview(g.id)}>Preview saved pose</button><button className="icon-button" aria-label={`Delete learned gesture ${g.name}`} onClick={()=>c.setItems(items=>items.filter(x=>x.id!==g.id))}><Trash2 size={16}/></button></article>)}</div>}
    </div>
  </section>;
}
