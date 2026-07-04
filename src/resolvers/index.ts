import Resolver from '@forge/resolver';
import { getPingResponse } from './ping';

const resolver = new Resolver();

resolver.define('ping', () => getPingResponse());

export const handler = resolver.getDefinitions();
