import express from "express";

export interface AppInterface {
  routes: any;             // express' routes list/object
  config: any;
  modules: string[];

  // all event handlers
  onReady: Function;
  onStart: Function;
  onStop: Function;
}

export interface IfcSampleInterface {
  key: string;
  value: string;
}

declare global {
  namespace Express {
    interface Request {
      jwt?: any
    }
  }
}


// export interface AppServerType: string;
/**
 * 
export interface LanguageRequest extends Request {
  language: Language
}
 */