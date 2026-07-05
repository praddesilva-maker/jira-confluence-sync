import Resolver from '@forge/resolver';
import { getPingResponse } from './ping';
import { registerConfigResolvers } from './config';

const resolver = new Resolver();

resolver.define('ping', () => getPingResponse());
registerConfigResolvers(resolver);

export const handler = resolver.getDefinitions();
