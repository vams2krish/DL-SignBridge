import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeftRight, ArrowRight, AudioLines, Camera, Check, CheckCircle2, ChevronRight, CircleHelp, Hand, History, Info, LockKeyhole, Mic, MicOff, Pause, Play, RotateCcw, Settings2, ShieldCheck, Sparkles, Square, Trash2, Volume2, X } from 'lucide-react';
import { CONNECTIONS, findGesture, gestures, planText, type GestureId } from './domain';
import { useVision } from './useVision';
import { useSpeech } from './useSpeech';
const Avatar = lazy(() => import('./Avatar'));
type Entry = { id: number; text: string; direction: string; source: string; time: string };
function IconMark() { return <span className="brand-icon"><Hand size={23} strokeWidth={1.8}/></span>; }
export default function App() {
  const [mode, setMode] = useState<'gesture'|'voice'>('gesture');
  const [view, setView] = useState<'studio'|'vocabulary'|'about'>('studio');
  const [caption, setCaption] = useState('');
  const [input, setInput] = useState('Hello');
  const [selected, setSelected] = useState<GestureId|null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [threshold, setThreshold] = useState(.70);
  const [voiceName, setVoiceName] = useState('');
  const [consent, setConsent] = useState(false);
  const [micConsent, setMicConsent] = useState(false);
  const [settings, setSettings] = useState(false);
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<Entry[]>([]);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [micDialog, setMicDialog] = useState(false);
  const [cameraDialog, setCameraDialog] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('Awaiting input');
  const overlay = useRef<HTMLCanvasElement>(null);
  const sampleImage = useRef<HTMLImageElement>(null);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  const cameraConsentDialog = useRef<HTMLDialogElement>(null);
  const microphoneDialog = useRef<HTMLDialogElement>(null);
  const addEntry = useCallback((text: string, direction: string, source: string) => {
    setHistory(h => [{id: Date.now()+Math.random(),text,direction,source,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})},...h].slice(0,20));
  }, []);
  const onGesture = useCallback((id: GestureId, _score: number, source: 'camera'|'sample') => {
    const gesture = findGesture(id); if(!gesture) return;
    setCaption(gesture.phrase);setSelected(id);setPlaying(true);
    setSourceLabel(source==='camera'?'Camera recognition':'Sample-photo recognition');
    setNotice(`${gesture.name} recognized. Review “${gesture.phrase}” before speaking.`);
  }, []);
  const vision=useVision(onGesture,threshold);
  const speech=useSpeech(text=>{setInput(text);setSelected(null);setNotice('Review your transcript, then animate the message.');});
  const current=findGesture(selected??'');
  useEffect(()=>{const d=settingsDialog.current;if(settings&&!d?.open)d?.showModal();else if(!settings&&d?.open)d.close();},[settings]);
  useEffect(()=>{const d=cameraConsentDialog.current;if(cameraDialog&&!d?.open)d?.showModal();else if(!cameraDialog&&d?.open)d.close();},[cameraDialog]);
  useEffect(()=>{const d=microphoneDialog.current;if(micDialog&&!d?.open)d?.showModal();else if(!micDialog&&d?.open)d.close();},[micDialog]);
  useEffect(()=>{
    const canvas=overlay.current; const ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
    const draw=()=>{
      const rect=canvas.getBoundingClientRect();canvas.width=rect.width;canvas.height=rect.height;
      const sourceWidth=vision.phase==='sample'?sampleImage.current?.naturalWidth:vision.video.current?.videoWidth;
      const sourceHeight=vision.phase==='sample'?sampleImage.current?.naturalHeight:vision.video.current?.videoHeight;
      if(!sourceWidth||!sourceHeight)return;
      const scale=Math.min(rect.width/sourceWidth,rect.height/sourceHeight);
      const width=sourceWidth*scale,height=sourceHeight*scale,ox=(rect.width-width)/2,oy=(rect.height-height)/2;
      for(const points of vision.detection?.landmarks??[]) {
        ctx.lineWidth=2;ctx.strokeStyle='#aaf4d0';ctx.fillStyle='#ffffff';
        for(const [a,b] of CONNECTIONS){ctx.beginPath();ctx.moveTo(ox+points[a].x*width,oy+points[a].y*height);ctx.lineTo(ox+points[b].x*width,oy+points[b].y*height);ctx.stroke();}
        for(const p of points){ctx.beginPath();ctx.arc(ox+p.x*width,oy+p.y*height,3,0,Math.PI*2);ctx.fill();}
      }
    };
    draw();const observer=new ResizeObserver(draw);observer.observe(canvas);return()=>observer.disconnect();
  },[vision.detection,vision.phase]);
  function changeView(next: typeof view){vision.stop();speech.stopListening();speech.stopSpeaking();setView(next);}
  function changeMode(next: typeof mode){vision.stop();speech.stopListening();speech.stopSpeaking();setSelected(null);setNotice('');setMode(next);setSourceLabel('Awaiting input');}
  function animate(text=input) {
    speech.stopListening();const plan=planText(text);setInput(text);
    if(!plan.supported){setSelected(null);setNotice(plan.reason);setSourceLabel('Text fallback');return;}
    setSelected(plan.gesture.id);setPlaying(true);setSourceLabel('Phrase mapping');setNotice(`Playing ${plan.gesture.name}. Illustrative gesture, not ASL translation.`);
    addEntry(text,'Text → avatar','Phrase mapping');
  }
  function speak(){if(!caption.trim())return;speech.speak(caption,speed,voiceName);addEntry(caption,'Gesture → speech',sourceLabel);}
  function clearSession(){vision.stop();speech.stopSpeaking();speech.stopListening();setCaption('');setInput('');setSelected(null);setHistory([]);setNotice('Session cleared. Camera and microphone stopped.');setSourceLabel('Awaiting input');setConsent(false);setMicConsent(false);}
  const active=vision.phase==='live'||vision.phase==='loading';
  const score=vision.detection?.score??0;
  return <>
    <a href="#workspace" className="skip-link">Skip to workspace</a>
    <header className="topbar"><a className="brand" href="#" onClick={e=>{e.preventDefault();changeView('studio');}}><IconMark/><span>SignBridge<span className="brand-dot">.</span></span></a>
      <nav aria-label="Main navigation"><button className={view==='studio'?'nav-active':''} onClick={()=>changeView('studio')}>Studio</button><button className={view==='vocabulary'?'nav-active':''} onClick={()=>changeView('vocabulary')}>Gesture library</button><button className={view==='about'?'nav-active':''} onClick={()=>changeView('about')}>About the demo</button></nav>
      <div className="top-actions"><span className="beta-tag">RESEARCH DEMO <span>01</span></span><a href="https://github.com/vams2krish/DL-SignBridge" target="_blank" rel="noreferrer" className="repo-link">View project <ArrowRight size={15}/></a></div>
    </header>
    <main id="workspace" tabIndex={-1}>
      {view==='studio'?<>
        <section className="intro"><div><p className="eyebrow"><span/> A MORE CONNECTED CONVERSATION</p><h1>A little movement.<br/>A clearer <em>connection.</em></h1><p className="intro-copy">Explore gestures, give them a voice, and see your words move.<br className="desktop-br"/> A small step toward more accessible communication.</p></div><div className="intro-note"><span className="note-icon"><ShieldCheck size={22}/></span><div><strong>Your camera stays with you.</strong><p>Vision runs on your device.<br/>No video recording or uploads.</p><span>PRIVATE BY DESIGN <LockKeyhole size={11}/></span></div></div></section>
        <div className="studio-heading"><div className="mode-tabs" role="group" aria-label="Translation direction"><button className={mode==='gesture'?'selected':''} aria-pressed={mode==='gesture'} onClick={()=>changeMode('gesture')}><Hand size={17}/> Gesture <ArrowRight size={14}/> Speech</button><button className={mode==='voice'?'selected':''} aria-pressed={mode==='voice'} onClick={()=>changeMode('voice')}><AudioLines size={17}/> Speech / text <ArrowRight size={14}/> Avatar</button></div><button className="settings-button" onClick={()=>setSettings(true)}><Settings2 size={16}/> Studio settings</button></div>
        <div className="studio-grid">
          <section className="input-panel panel" aria-labelledby="input-title"><div className="panel-header"><div><span className="step">01</span><h2 id="input-title">{mode==='gesture'?'Your gestures':'Your message'}</h2></div><span className="small-tag">{mode==='gesture'?'ON-DEVICE VISION':'ENGLISH INPUT'}</span></div>
            {mode==='gesture'?<>
              <div className={`camera-stage ${vision.phase==='live'?'is-live':''}`}>
                <div className="stage-top"><span className={`camera-status ${vision.phase==='live'?'on':''}`}><span/>{vision.phase==='live'?'Camera live':vision.phase==='sample'?'SAMPLE PHOTO':vision.phase==='loading'?'Preparing model':'Camera off'}</span><span className="frame-label">ONE HAND · FRONT VIEW</span></div>
                <video ref={vision.video} autoPlay playsInline muted aria-label="Live camera preview" className={vision.phase==='live'?'visible':''}/>
                {vision.phase==='sample'&&<img ref={sampleImage} src="/thumb-up.jpg" className="sample-image" alt="MediaPipe test photo: a hand showing thumb up"/>}
                <canvas ref={overlay} width={640} height={480} aria-hidden="true" className={vision.phase==='live'?'mirrored':''}/>
                {!['live','sample'].includes(vision.phase)&&<div className="camera-empty"><div className="scan-corners"><Hand size={58} strokeWidth={1.1}/></div><h3>{vision.phase==='loading'?'Getting ready to see you…':'Start with a simple hello.'}</h3><p>{vision.phase==='loading'?'Loading the local recognition model.':'Turn on your camera and hold one supported gesture.'}</p><span>{vision.phase==='loading'?'You can cancel at any time.':'Good lighting. One hand. A little space.'}</span></div>}
                {vision.detection&&<div className="detection-pill"><span/>{findGesture(vision.detection.id)?.name??'No supported gesture'}<strong>{Math.round(score*100)}%</strong></div>}
              </div>
              <div className="camera-controls"><button className="primary" onClick={()=>active?vision.stop():consent?void vision.start():setCameraDialog(true)}>{active?<Square size={16}/>:<Camera size={17}/>} {active?'Stop camera':'Enable camera'}</button><button className="secondary" disabled={vision.phase==='loading'} onClick={()=>void vision.start(true)}><Play size={15}/> Run sample photo</button>{vision.phase==='sample'&&<button className="icon-button" aria-label="Clear sample" onClick={vision.stop}><X size={17}/></button>}</div>
              <p className="under-control"><LockKeyhole size={12}/> Camera starts only with permission. Nothing is recorded.</p>
              {vision.error&&<p role="alert" className="error-box">{vision.error}</p>}
              <div className="recognition-readout"><div><span className="micro-label">MODEL CONFIDENCE</span><div className="confidence-track"><span style={{width:`${score*100}%`}}/></div></div><strong>{vision.detection?`${Math.round(score*100)}%`:'—'}</strong><div className="latency"><span className="micro-label">INFERENCE</span><strong>{vision.detection?`${Math.round(vision.detection.inferenceMs)} ms`:'—'}</strong></div></div>
            </>:<div className="message-input"><p className="field-intro">A few words can make a connection.</p><label htmlFor="message">Type or dictate a supported phrase</label><textarea id="message" maxLength={500} value={input} onChange={e=>{setInput(e.target.value);setSelected(null);setNotice('');speech.stopSpeaking();}} placeholder="Try Hello, Yes, or One moment…"/><div className="text-meta"><span>{input.length}/500</span><span>English · bounded vocabulary</span></div><div className="message-actions"><button className="primary" onClick={()=>animate()}><Sparkles size={16}/> Animate message</button><button className={`secondary ${speech.listening?'recording':''}`} disabled={!speech.canListen} onClick={()=>speech.listening?speech.stopListening():micConsent?speech.listen():setMicDialog(true)}>{speech.listening?<MicOff size={16}/>:<Mic size={16}/>} {speech.listening?'Stop listening':'Use microphone'}</button></div>{!speech.canListen&&<p className="under-control">Microphone transcription is unavailable in this browser. Text input works.</p>}<p className="privacy-copy"><Info size={13}/> Browser speech recognition may send audio to its provider. It starts only after separate consent.</p><div className="phrase-chooser"><span className="micro-label">OR TRY A PHRASE</span><div>{gestures.map(g=><button key={g.id} onClick={()=>animate(g.phrase)}>{g.phrase} <ArrowUpRightSmall/></button>)}</div></div></div>}
          </section>
          <section className="output-panel panel" aria-labelledby="output-title"><div className="panel-header"><div><span className="step">02</span><h2 id="output-title">{mode==='gesture'?'A voice for your gesture':'Your avatar in motion'}</h2></div><span className="avatar-label"><span/> AVATAR STUDIO</span></div>
            <div className="avatar-stage"><span className="avatar-stage-label">MEET ARI <span>· YOUR VISUAL COMPANION</span></span><div className="avatar-halo"/><Suspense fallback={<div className="avatar-loading">Preparing avatar…</div>}><Avatar gesture={selected} playing={playing} speaking={speech.speaking} speed={speed} reduced={reduced}/></Suspense><div className="avatar-ground"/><div className="avatar-caption">{current?<><span className="gesture-symbol">{current.emoji}</span><div><span className="micro-label">{mode==='gesture'?'RECOGNIZED GESTURE':'ILLUSTRATIVE GESTURE'}</span><strong>{current.name}</strong></div></>:<><span className="gesture-symbol"><Hand size={20}/></span><div><span className="micro-label">READY WHEN YOU ARE</span><strong>Let’s make a connection</strong></div></>}</div><div className="avatar-playback"><button className="icon-button" aria-label={playing?'Pause avatar idle animation':'Play avatar idle animation'} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={15}/>:<Play size={15}/>}</button><button className="icon-button" aria-label="Reset avatar pose" onClick={()=>{setSelected(null);setPlaying(true);}}><RotateCcw size={15}/></button><label className="speed-control">Speed <select aria-label="Playback speed" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option></select></label></div></div>
            <div className="caption-editor"><div className="caption-label"><label htmlFor={mode==='gesture'?'caption':'text-fallback'}>{mode==='gesture'?'REVIEW YOUR CAPTION':'MESSAGE / TEXT FALLBACK'}</label><span>{mode==='gesture'?'EDITABLE':'ALWAYS VISIBLE'}</span></div>{mode==='gesture'?<textarea id="caption" rows={2} maxLength={500} placeholder="Your recognized phrase will appear here…" value={caption} onChange={e=>{setCaption(e.target.value);speech.stopSpeaking();}}/>:<p id="text-fallback" className="fallback-text">{input||'Your message will appear here.'}</p>}<div className="caption-actions">{mode==='gesture'?<button className="speak-button" disabled={!caption.trim()||!speech.canSpeak} onClick={speech.speaking?speech.stopSpeaking:speak}>{speech.speaking?<Square size={15}/>:<Volume2 size={17}/>} {speech.speaking?'Stop speaking':'Speak caption'}</button>:<span className="mapping-source"><CheckCircle2 size={15}/>{sourceLabel}</span>}<span className="caption-note">{mode==='gesture'?'You choose what gets spoken.':'Static gestures, not sentence translation.'}</span></div></div>
          </section>
        </div>
        <div className="feedback" role="status" aria-live="polite">{speech.error||notice||'Ready. Enable your camera, or run the sample photo to explore without one.'}</div>
        <section className="quick-library"><div className="section-heading"><div><span className="micro-label">SMALL VOCABULARY. REAL POSSIBILITIES.</span><h2>Seven gestures to get started</h2></div><button onClick={()=>changeView('vocabulary')}>Explore the library <ArrowRight size={16}/></button></div><div className="gesture-strip">{gestures.map(g=><button key={g.id} className={selected===g.id?'gesture-card active':'gesture-card'} onClick={()=>{setSelected(g.id);setPlaying(true);setSourceLabel('Manual preview');setNotice(`Manual preview: ${g.name}. This selection is not a recognition result.`);if(mode==='voice')setInput(g.phrase);}}><span>{g.emoji}</span><strong>{g.name}</strong><small>{g.phrase}</small></button>)}</div></section>
        <section className="session-section"><div className="section-heading"><h2><History size={17}/> This session <span>{history.length}</span></h2><button onClick={clearSession}><Trash2 size={14}/> Clear session & stop devices</button></div>{history.length?<ol className="history-list">{history.map(h=><li key={h.id}><span className="history-direction">{h.direction}</span><strong>{h.text}</strong><span>{h.source}</span><time>{h.time}</time></li>)}</ol>:<p className="history-empty">Your confirmed speech and avatar messages appear here. Session history stays in memory and clears on reload.</p>}</section>
      </>:view==='vocabulary'?<section className="library-page"><p className="eyebrow"><span/> THE GESTURE LIBRARY</p><h1>Start small.<br/><em>Connect clearly.</em></h1><p className="intro-copy">Seven model categories, seven chosen communication intents.<br/>These mappings are demo conventions, not an ASL dictionary.</p><div className="library-grid">{gestures.map(g=><article className="library-item" key={g.id}><span className="large-emoji">{g.emoji}</span><span className="micro-label">{g.id.replaceAll('_',' ').toUpperCase()}</span><h2>{g.name}</h2><span className="phrase-tag">“{g.phrase}”</span><p>{g.hint}</p><button className="secondary" onClick={()=>{setView('studio');setMode('voice');animate(g.phrase);}}>Preview avatar <ArrowRight size={15}/></button></article>)}</div></section>:<section className="about-page"><p className="eyebrow"><span/> BUILT WITH CARE. SHARED WITH CLARITY.</p><h1>A bridge in progress.</h1><p className="intro-copy">An honest, working baseline for a much bigger accessibility goal.</p><div className="about-grid"><article className="panel"><ShieldCheck/><h2>What works today</h2><p>On-device neural gesture recognition, a real model-powered sample, stable caption proposals, editable text-to-speech, browser microphone transcription, and a procedural 3D gesture avatar.</p><p>The camera model recognizes seven isolated hand categories. It does not understand sentences, facial grammar, or continuous signing.</p></article><article className="panel"><Hand/><h2>What needs people and research</h2><p>ASL–English translation, linguist-reviewed motion, broad signer evaluation, calibrated uncertainty, and interpreter-grade reliability are not implemented.</p><p>The avatar is an illustration. Its gestures are not validated instructional sign-language material. Mouth movement is decorative, not phoneme-based lip synchronization.</p></article><article className="panel"><LockKeyhole/><h2>Your data, your choice</h2><p>Camera frames run through a self-hosted model in a browser worker. The app has no recording, analytics, backend, or persistent conversation storage.</p><p>Browser speech recognition may use a remote browser-provider service. Voices can also be remote; the voice selector labels local voices. Closing or hiding this page stops media and speech.</p></article><article className="panel"><CheckCircle2/><h2>A measured next step</h2><p>Before broader use: partner with Deaf collaborators, validate the selected language pair, evaluate unseen signers and avatar comprehension, and publish the results.</p><a href="https://github.com/vams2krish/DL-SignBridge" target="_blank" rel="noreferrer">Read the roadmap on GitHub <ArrowRight size={15}/></a></article></div></section>}
      <aside className="scope-note"><Info size={17}/><p><strong>A gesture demo, with a bigger mission.</strong> This version recognizes seven isolated gestures and maps selected phrases to illustrative avatar poses. It does not translate ASL or continuous sign language.</p><button onClick={()=>changeView('about')} aria-label="Learn about demo limitations"><ChevronRight size={20}/></button></aside>
    </main>
    <footer><div className="footer-brand"><IconMark/><strong>SignBridge.</strong><span>Building toward understanding.</span></div><span>Made for connection. Developed with transparency.</span><button onClick={()=>changeView('about')}>Privacy & limitations <ArrowRight size={13}/></button></footer>
    <dialog ref={settingsDialog} onCancel={()=>setSettings(false)} onClose={()=>setSettings(false)} aria-labelledby="settings-title"><div className="dialog-head"><h2 id="settings-title">Studio settings</h2><button className="icon-button" aria-label="Close settings" onClick={()=>setSettings(false)}><X size={20}/></button></div><p>Controls apply to this session only.</p><label className="setting-row">Recognition threshold <strong>{Math.round(threshold*100)}%</strong><input aria-label="Recognition confidence threshold" type="range" min={.5} max={.95} step={.05} value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label><p className="setting-help">Camera proposals require a 650 ms confident hold. Lower thresholds can produce more false positives. Model confidence is not measured accuracy.</p><label className="setting-row">Speaking voice<select aria-label="Speaking voice" value={voiceName} onChange={e=>setVoiceName(e.target.value)}><option value="">Browser default (may be remote)</option>{speech.voices.map(v=><option value={v.name} key={v.voiceURI}>{v.name} · {v.lang} · {v.localService?'local':'remote'}</option>)}</select></label><label className="checkbox-row"><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Reduce decorative avatar motion</label><button className="primary full" onClick={()=>setSettings(false)}>Done <Check size={16}/></button></dialog>
    <dialog ref={cameraConsentDialog} onCancel={()=>setCameraDialog(false)} onClose={()=>setCameraDialog(false)} aria-labelledby="camera-consent-title"><div className="dialog-head"><h2 id="camera-consent-title">Your camera, on your terms.</h2><button className="icon-button" aria-label="Close camera consent" onClick={()=>setCameraDialog(false)}><X size={20}/></button></div><p>Video is processed on this device. No frames are uploaded or recorded by SignBridge. The browser will ask for camera access next.</p><p>Use Stop camera at any time. Switching views or hiding the page also stops capture.</p><div className="dialog-actions"><button className="secondary" onClick={()=>setCameraDialog(false)}>Not now</button><button className="primary" onClick={()=>{setConsent(true);setCameraDialog(false);void vision.start();}}>Allow camera <Camera size={16}/></button></div></dialog>
    <dialog ref={microphoneDialog} onCancel={()=>setMicDialog(false)} onClose={()=>setMicDialog(false)} aria-labelledby="mic-consent-title"><div className="dialog-head"><h2 id="mic-consent-title">Before you use the microphone</h2><button className="icon-button" aria-label="Close microphone consent" onClick={()=>setMicDialog(false)}><X size={20}/></button></div><p>Your browser may send audio to its speech-recognition provider. SignBridge does not record or store audio. Review the transcript before animating it.</p><p>You can always type instead.</p><div className="dialog-actions"><button className="secondary" onClick={()=>setMicDialog(false)}>Type instead</button><button className="primary" onClick={()=>{setMicConsent(true);setMicDialog(false);speech.listen();}}>Start microphone <Mic size={16}/></button></div></dialog>
  </>;
}
function ArrowUpRightSmall(){return <ArrowRight size={12} style={{transform:'rotate(-35deg)'}}/>;}
