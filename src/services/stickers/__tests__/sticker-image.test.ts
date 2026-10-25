import { stickerImageUri } from '../sticker-image';

describe('stickerImageUri', () => {
  const original = process.env.EXPO_PUBLIC_R2_PUBLIC_URL;
  afterEach(() => {
    process.env.EXPO_PUBLIC_R2_PUBLIC_URL = original;
  });

  it('resizes storage keys on the public media host at twice the size', () => {
    process.env.EXPO_PUBLIC_R2_PUBLIC_URL = 'https://media.example.com/';
    expect(stickerImageUri('/stickers/cat.png', 64)).toBe(
      'https://media.example.com/cdn-cgi/image/width=128,height=128,fit=contain/stickers/cat.png'
    );
  });

  it('resizes full URLs on their own host', () => {
    expect(stickerImageUri('https://cdn.example.com/a/cat.png', 50)).toBe(
      'https://cdn.example.com/cdn-cgi/image/width=100,height=100,fit=contain/a/cat.png'
    );
  });

  it('gives up without a media host or a path', () => {
    delete process.env.EXPO_PUBLIC_R2_PUBLIC_URL;
    expect(stickerImageUri('stickers/cat.png', 64)).toBeNull();
    expect(stickerImageUri('  ', 64)).toBeNull();
  });
});
