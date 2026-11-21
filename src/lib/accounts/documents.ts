import {summarize,validateLetter,type Letter} from '../letters';
import {validateBook,type MemoryBookDocument} from '../memory-books';
import {validateTree,type Tree} from '../memory-tree';
import {summarizeJourney,validateJourney,type Journey} from '../journey-letters';
import type {SpaceKind} from './identity';

export type Documents = {letters:Letter;books:MemoryBookDocument;trees:Tree;journeys:Journey};
export type CloudScope = {owner:string;kind:SpaceKind;path:string};
export type LibraryItem = {id:string;sourceId:string;kind:SpaceKind;title:string;owned:boolean;ownerName:string;updated:string;draft:boolean;shared:boolean};
export type CloudDocument = {id:string;ownerId:string;kind:SpaceKind;title:string;sourceId:string;payload:unknown;owned:boolean;shared:boolean;
  locked:boolean;opens:number|null;gates:{position:number;instant:number;sealed:boolean}[]};
export type StoredEntry = {id:string;docId:string;summary:unknown;payload:unknown};
export type ScopeResult = {revision:number;metadata:Record<string,unknown>;documents:StoredEntry[]};
export const sourceIdPattern = /^[A-Za-z0-9_-]{1,100}$/;
export const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const validators = {letters:validateLetter,books:validateBook,trees:validateTree,journeys:validateJourney};
export function validateDocument<K extends SpaceKind>(kind:K,value:unknown):Documents[K] {
  return validators[kind](value) as Documents[K];
}
export function describeDocument(kind:SpaceKind, value:unknown) {
  switch(kind) {
    case 'letters': {
      const v=validateLetter(value);
      return {id:v.id,title:v.title||'Untitled letter',draft:v.state==='draft',summary:summarize(v),payload:v};
    }
    case 'books': {
      const v=validateBook(value);
      return {id:v.id,title:v.title||'Untitled book',draft:false,summary:{pages:v.pages.length},payload:v};
    }
    case 'trees': {
      const v=validateTree(value);
      return {id:v.id,title:v.settings.name||'Memory Tree',draft:false,summary:{memories:v.memories.length},payload:v};
    }
    case 'journeys': {
      const v=validateJourney(value);
      const summary=summarizeJourney(v);
      return {id:v.id,title:v.name,draft:summary.completed<6,summary,payload:v};
    }
  }
}
