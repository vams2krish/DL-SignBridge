import type { Detection } from './domain';
export type VisionConfig={mode:'IMAGE'|'VIDEO';hands:1|2;backend:'auto'|'CPU'};
export type EngineInfo={delegate:'CPU'|'GPU';mode:'IMAGE'|'VIDEO';hands:number};
/** Correlated requests, bounded timeouts and one worker; no images are persisted. */
export class VisionEngine {
  private worker:Worker;
  private next=1;
  private pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  private disposed=false;
  constructor(){
    this.worker=new Worker('/recognizer.worker.js');
    this.worker.onmessage=({data})=>{const request=this.pending.get(data.requestId);if(!request)return;clearTimeout(request.timer);this.pending.delete(data.requestId);data.type==='error'?request.reject(new Error(data.message)):request.resolve(data);};
    this.worker.onerror=()=>this.dispose(new Error('The vision worker stopped. Retry with CPU processing or a current browser.'));
  }
  private request(data:Record<string,unknown>,transfer:Transferable[]=[],timeout=12000):Promise<any>{
    if(this.disposed)return Promise.reject(new Error('Vision engine was closed.'));
    const requestId=this.next++;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(requestId);reject(new Error('Vision processing timed out. Try Fast resolution or CPU processing.'));this.dispose();},timeout);
      this.pending.set(requestId,{resolve,reject,timer});
      try{this.worker.postMessage({...data,requestId},transfer);}catch(e){clearTimeout(timer);this.pending.delete(requestId);reject(e);}
    });
  }
  async configure(config:VisionConfig):Promise<EngineInfo>{const result=await this.request({type:'init',...config},[],45000);return result.engine;}
  async recognize(bitmap:ImageBitmap,timestamp:number):Promise<Detection>{const result=await this.request({type:'frame',bitmap,timestamp},[bitmap]);return result.detection;}
  dispose(error=new Error('Vision session closed.')){if(this.disposed)return;this.disposed=true;this.worker.terminate();for(const request of this.pending.values()){clearTimeout(request.timer);request.reject(error);}this.pending.clear();}
}
