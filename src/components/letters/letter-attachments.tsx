'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { VOICE_UPLOAD_LIMIT, voiceTime, type VoiceAsset } from '@/lib/book-voice';
import { prepareVoice } from '@/lib/voice-capture';

type Capture = { stream:MediaStream; recorder:MediaRecorder; limit:number };
type Phase = 'idle'|'permission'|'recording'|'preparing';
export function VoiceAttachment({asset,onChange,busy}:{asset:VoiceAsset|null;onChange:(asset:VoiceAsset|null)=>void;busy:(busy:boolean)=>void}){
  const [phase,setPhase]=useState<Phase>('idle'),[error,setError]=useState('');
  const recording=useRef<Capture|null>(null),job=useRef(0);
  const onChangeRef=useRef(onChange),busyRef=useRef(busy);onChangeRef.current=onChange;busyRef.current=busy;
  function close(capture:Capture|null){
    if(!capture)return;
    window.clearTimeout(capture.limit);
    capture.stream.getTracks().forEach(track=>track.stop());
  }
  const cancel=useCallback(()=>{
    job.current++;
    const current=recording.current;
    recording.current=null;
    if(current?.recorder.state==='recording')current.recorder.stop();
    close(current);
  },[]);
  useEffect(()=>()=>{cancel();busyRef.current(false);},[cancel]);
  function transition(next:Phase){setPhase(next);busyRef.current(next!=='idle');}
  async function prepare(blob:Blob,name:string,token:number) {
    transition('preparing');
    try {
      const result=await prepareVoice(blob,name);
      if(job.current===token)onChangeRef.current(result);
    } catch(reason) {
      if(job.current===token)setError(reason instanceof Error?reason.message:'Unable to prepare the audio.');
    } finally {if(job.current===token)transition('idle');}
  }
  async function start(){
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
      setError('Recording is unavailable here. Add a local audio file instead.');return;
    }
    const token=++job.current;
    setError('');transition('permission');
    let stream:MediaStream|undefined;
    try {
      stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1}});
      if(job.current!==token){stream.getTracks().forEach(track=>track.stop());return;}
      const mimeType=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
      const chunks:Blob[]=[];
      let size=0;
      const active:Capture={recorder,stream,limit:0};
      recording.current=active;
      recorder.ondataavailable=event=>{
        if(job.current!==token||!event.data.size)return;
        size+=event.data.size;
        if(size>VOICE_UPLOAD_LIMIT){cancel();transition('idle');setError('The recording exceeded the local audio limit.');}
        else chunks.push(event.data);
      };
      recorder.onstop=()=>{
        close(active);
        if(recording.current===active)recording.current=null;
        if(job.current===token)void prepare(new Blob(chunks,{type:recorder.mimeType}),'Voice recording',token);
      };
      recorder.onerror=()=>{
        if(job.current===token){cancel();transition('idle');setError('Recording stopped unexpectedly. Try again or choose a local recording.');}
      };
      recorder.start(200);
      active.limit=window.setTimeout(()=>{if(recorder.state==='recording')recorder.stop();close(active);},58_000);
      transition('recording');
    } catch (reason) {
      stream?.getTracks().forEach(track=>track.stop());
      if(job.current!==token)return;
      transition('idle');setError(reason instanceof DOMException&&reason.name==='NotAllowedError'?'Microphone access was declined. You can add a recording from a file.':'Could not start the microphone.');
    }
  }
  return <div className="lt-voice-controls">
    {phase==='idle'?<button type="button" onClick={()=>void start()}>Record voice</button>:<button type="button" onClick={()=>{cancel();transition('idle');}}>Cancel audio</button>}
    {phase==='recording'&&<button type="button" onClick={()=>{
      const active=recording.current;
      if(active?.recorder.state==='recording'){active.recorder.stop();close(active);transition('preparing');}
    }}>Keep recording</button>}
    <label>Audio file<input type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm" disabled={phase!=='idle'}
      onChange={event=>{
        const file=event.currentTarget.files?.[0];event.currentTarget.value='';
        if(file){setError('');void prepare(file,file.name,++job.current);}
      }}/></label>
    <p role="status">{phase==='permission'?'Waiting for microphone access…':phase==='recording'?'Recording · up to one minute':phase==='preparing'?'Preparing local audio…':
      asset?asset.name+' · '+voiceTime(asset.durationMs/1000):'Up to one minute. Recordings are saved on this device.'}</p>
    {error&&<p role="alert">{error}</p>}
    {asset&&phase==='idle'&&<><audio src={asset.data} controls preload="none" aria-label="Preview the voice recording"/>
      <button type="button" onClick={()=>onChange(null)}>Remove audio</button></>}
  </div>;
}
