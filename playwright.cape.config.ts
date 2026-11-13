import {defineConfig} from '@playwright/test';
import photo from './playwright.photo.config';
export default defineConfig({...photo,testMatch:'photo-cape.spec.ts'});
