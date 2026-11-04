import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);

// jsdom does no layout, so every element would look hidden to enterToNext.
Element.prototype.getClientRects = () => [{}] as unknown as DOMRectList;
