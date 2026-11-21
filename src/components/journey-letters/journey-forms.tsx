'use client';

import { useId, useMemo, useState, type FormEvent } from 'react';
import { journeyCities } from '@/lib/journey-cities';
import { checkpointTimes, checkpointZone, formatJourneyTime, resolveJourneyPlan, validateJourney,
  type Journey, type JourneyPlace, type JourneyPlan } from '@/lib/journey-letters';
import { localZone, resolveRelease, validZone, wallOptions, type Timing } from '@/lib/letter-time';
import { JourneyMap } from './journey-map';

const reason = (error: unknown) => error instanceof Error ? error.message : 'This journey could not be saved.';
type StopFields = { city: string; lat: string; lon: string; timing: Timing };
function startingStop(place?: JourneyPlace, timing?: Timing): StopFields {
  return { city:place?.name ?? '', lat:place?.point?.lat.toString() ?? '', lon:place?.point?.lon.toString() ?? '',
    timing:timing ?? { wall:'',zone:localZone(),occurrence:'earlier' } };
}
function place(fields: StopFields): JourneyPlace {
  if (!!fields.lat !== !!fields.lon) throw new Error('Enter both coordinates or leave both blank.');
  return { name:fields.city, point:fields.lat && fields.lon ? {lat:Number(fields.lat),lon:Number(fields.lon)} : null };
}

function TimingFields({ prefix, value, change }: {prefix: string; value: Timing; change: (value: Timing)=>void}) {
  const list = useId();
  const repeated = useMemo(() => wallOptions(value.wall,value.zone).length > 1,[value.wall,value.zone]);
  const zones = useMemo(() => Array.from(new Set(['UTC',...journeyCities.map(city=>city.zone),
    ...(typeof Intl.supportedValuesOf==='function'?Intl.supportedValuesOf('timeZone'):[])] )).filter(validZone).sort(),[]);
  return <div className="jl-fields">
    <label>{prefix} time<input type="datetime-local" required min="1900-01-01T00:00" max="2199-12-31T23:59" value={value.wall}
      onChange={e=>change({...value,wall:e.target.value,occurrence:'earlier'})}/></label>
    <label>{prefix} time zone<input type="text" required list={list} maxLength={96} value={value.zone}
      onChange={e=>change({...value,zone:e.target.value,occurrence:'earlier'})}/></label>
    <datalist id={list}>{zones.map(zone=><option value={zone} key={zone}/>)}</datalist>
    {repeated&&<label>Occurrence of the repeated hour<select value={value.occurrence}
      onChange={e=>change({...value,occurrence:e.target.value as Timing['occurrence']})}>
      <option value="earlier">First occurrence</option><option value="later">Second occurrence</option>
    </select></label>}
  </div>;
}

function CityFields({ prefix, value, change }: {prefix:string; value:StopFields; change:(value:StopFields)=>void}) {
  const selected = journeyCities.find(city=>city.name===value.city && String(city.lat)===value.lat && String(city.lon)===value.lon);
  return <fieldset className="jl-city-fields">
    <legend>{prefix}</legend>
    <label>{prefix} city<select aria-label={`${prefix} city`} value={selected?.id ?? ''} onChange={event=>{
      const city = journeyCities.find(item=>String(item.id)===event.target.value);
      change(city ? {city:city.name,lat:String(city.lat),lon:String(city.lon),
        timing:{...value.timing,zone:city.zone,occurrence:'earlier'}} : {...value,city:'',lat:'',lon:''});
    }}>
      <option value="">Enter a city manually</option>
      {journeyCities.map(city=><option key={city.id} value={city.id}>{city.name}</option>)}
    </select></label>
    {!selected&&<><label>{prefix} city name<input required maxLength={90} value={value.city} onChange={e=>change({...value,city:e.target.value})}/></label>
      <details><summary>Map coordinates (optional)</summary>
        <p>Use known coordinates, or leave them blank for an illustrated route with city names.</p>
        <div className="jl-pair">
          <label>Latitude<input type="number" min="-90" max="90" step="any" value={value.lat} onChange={e=>change({...value,lat:e.target.value})}/></label>
          <label>Longitude<input type="number" min="-180" max="180" step="any" value={value.lon} onChange={e=>change({...value,lon:e.target.value})}/></label>
        </div>
      </details>
    </>}
    <TimingFields prefix={prefix} value={value.timing} change={timing=>change({...value,timing})}/>
  </fieldset>;
}

export function RouteTimes({ plan }: {plan: JourneyPlan}) {
  return <dl className="jl-endpoints">
    <div><dt>Departure</dt><dd><strong>{plan.from.name}</strong><span>{formatJourneyTime(plan.departure.instant,plan.departure.zone)}</span></dd></div>
    <div><dt>Arrival</dt><dd><strong>{plan.to.name}</strong><span>{formatJourneyTime(plan.arrival.instant,plan.arrival.zone)}</span></dd></div>
  </dl>;
}

export function JourneySetup({original,busy,cancel,save}:{
  original?:Journey;busy:boolean;cancel:()=>void;save:(plan:JourneyPlan)=>void;
}) {
  const [name,setName]=useState(original?.name??'');
  const [dedication,setDedication]=useState(original?.dedication??'');
  const [from,setFrom]=useState(()=>startingStop(original?.from,original?.departure));
  const [to,setTo]=useState(()=>startingStop(original?.to,original?.arrival));
  const [review,setReview]=useState<JourneyPlan|null>(null);
  const [error,setError]=useState('');
  function submit(event:FormEvent) {
    event.preventDefault();
    try {
      setError('');
      const plan = resolveJourneyPlan({ name,dedication,from:place(from),to:place(to),departure:from.timing,arrival:to.timing },original);
      if (original) validateJourney({...original,...plan});
      setReview(plan);
      requestAnimationFrame(()=>document.getElementById('jl-review')?.focus());
    } catch (error) {setError(reason(error));}
  }
  return <section className="jl-inset">
    <button className="jl-link" onClick={cancel} disabled={busy}>← {original?'Back to journey':'Back to journeys'}</button>
    {review?<div className="jl-setup-review">
      <header className="jl-heading">
        <p className="jl-small">Six letters · One journey</p>
        <h1 id="jl-review" tabIndex={-1}>{review.name}</h1>
        {review.dedication&&<p className="jl-dedication">{review.dedication}</p>}
      </header>
      <JourneyMap from={review.from} to={review.to} progress={0}/>
      <RouteTimes plan={review}/>
      <div className="jl-actions"><button className="jl-secondary" onClick={()=>setReview(null)} disabled={busy}>Edit details</button>
        <button className="jl-primary" onClick={()=>save(review)} disabled={busy}>{original?'Save journey details':'Save journey'}</button></div>
    </div>:<>
      <header className="jl-heading"><p className="jl-small">Journey Letters</p>
        <h1 data-jl-focus tabIndex={-1}>{original?'Edit your journey.':'Where are they headed?'}</h1>
        <p>Use each city’s local date and time.</p></header>
      <form className="jl-setup-form" onSubmit={submit}>
        {error&&<p className="jl-notice" role="alert">{error}</p>}
        <div className="jl-fields">
          <label>Journey name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="The long way back"/></label>
          <label>Dedication (optional)<textarea rows={2} maxLength={500} value={dedication} onChange={e=>setDedication(e.target.value)} placeholder="Something to carry with you."/></label>
        </div>
        <div className="jl-pair"><CityFields prefix="Departure" value={from} change={setFrom}/>
          <CityFields prefix="Arrival" value={to} change={setTo}/></div>
        <button className="jl-primary">Review journey</button>
      </form>
    </>}
  </section>;
}

function wallFor(instant: number, zone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
    timeZone:zone, calendar:'iso8601',numberingSystem:'latn',hourCycle:'h23',
    year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',
  }).formatToParts(instant).map(part=>[part.type,part.value]));
  return {wall:`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`,zone,occurrence:'earlier'} as const;
}

export function JourneySchedule({journey,busy,cancel,save}: {
  journey:Journey;busy:boolean;cancel:()=>void;save:(journey:Journey)=>void;
}) {
  const [stops,setStops]=useState(()=>journey.checkpoints.map(stop=>({label:stop.label,timing:stop.custom as Timing|null})));
  const [error,setError]=useState('');
  const defaults = checkpointTimes({...journey,checkpoints:journey.checkpoints.map(stop=>({...stop,custom:null}))});
  const defaultZone = (index:number) => index < 3 ? journey.departure.zone : journey.arrival.zone;
  function change(index:number, next:Partial<typeof stops[number]>) {
    setStops(rows=>rows.map((row,i)=>i===index?{...row,...next}:row));
  }
  function submit(event:FormEvent) {
    event.preventDefault();
    try {
      const next = {...journey,checkpoints:journey.checkpoints.map((stop,index)=>{
        const {label,timing} = stops[index];
        let custom = null;
        if (timing) {
          try {
            custom = stop.custom && stop.custom.wall===timing.wall && stop.custom.zone===timing.zone &&
              stop.custom.occurrence===timing.occurrence ? stop.custom : resolveRelease(timing);
          } catch { throw new Error(`Choose a valid opening time for envelope ${index+1}. The time might fall in a daylight-saving gap.`); }
        }
        return {...stop,label:label.trim(),custom};
      })};
      save(validateJourney(next));
    } catch (error) {setError(reason(error));}
  }
  return <section className="jl-inset">
    <button className="jl-link" disabled={busy} onClick={cancel}>← Back to journey</button>
    <header className="jl-heading"><p className="jl-small">{journey.name}</p>
      <h1 data-jl-focus tabIndex={-1}>When each letter opens.</h1>
      <p>Default times follow your flight schedule. Custom times stay as you set them, in the time zone you choose.</p>
    </header>
    <form className="jl-schedule" onSubmit={submit}>
      {error&&<p className="jl-notice" role="alert">{error}</p>}
      {stops.map((stop,index)=><fieldset className="jl-city-fields" key={journey.checkpoints[index].id}>
        <legend>Envelope {index+1}</legend>
        <label>Checkpoint name<input required maxLength={70} value={stop.label} onChange={e=>change(index,{label:e.target.value})}/></label>
        <p className="jl-default-time">Scheduled default · {formatJourneyTime(defaults[index],defaultZone(index))}</p>
        <label className="jl-checkbox"><input type="checkbox" checked={!!stop.timing} onChange={e=>change(index,{
          timing:e.target.checked?wallFor(defaults[index],checkpointZone(journey,index)):null,
        })}/> Set a custom opening time</label>
        {stop.timing&&<TimingFields prefix="Opening" value={stop.timing} change={timing=>change(index,{timing})}/>}
      </fieldset>)}
      <button className="jl-primary" disabled={busy}>Save opening times</button>
    </form>
  </section>;
}
