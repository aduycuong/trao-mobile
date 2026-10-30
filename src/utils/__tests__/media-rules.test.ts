import { checkVideo, planPicks, videoMime } from '../media-rules';

describe('videoMime', () => {
  it('takes the picker mime type, else guesses from the file name', () => {
    expect(videoMime('video/quicktime', 'file:///a')).toBe('video/quicktime');
    expect(videoMime(null, 'file:///a/clip.MOV?x=1')).toBe('video/quicktime');
    expect(videoMime('application/octet-stream', 'file:///a/clip.mp4')).toBe('video/mp4');
    expect(videoMime(null, 'file:///a/clip.avi')).toBeNull();
  });
});

describe('checkVideo', () => {
  const ok = { mime: 'video/mp4', sizeBytes: 10 * 1024 * 1024, durationMs: 8000 };

  it('accepts a clip of 5 to 30 seconds under 80 MB', () => {
    expect(checkVideo(ok)).toBeNull();
    expect(checkVideo({ ...ok, durationMs: 5000 })).toBeNull();
    expect(checkVideo({ ...ok, durationMs: 30_200 })).toBeNull();
  });

  it('says why a clip cannot be used', () => {
    expect(checkVideo({ ...ok, mime: null })).toMatch(/MP4, MOV hoặc WebM/);
    expect(checkVideo({ ...ok, sizeBytes: 81 * 1024 * 1024 })).toMatch(/80 MB/);
    expect(checkVideo({ ...ok, durationMs: 3000 })).toMatch(/ít nhất 5 giây/);
    expect(checkVideo({ ...ok, durationMs: 45_000 })).toMatch(/tối đa 30 giây/);
    expect(checkVideo({ ...ok, durationMs: null })).toMatch(/độ dài/);
  });
});

describe('planPicks', () => {
  const photo = { kind: 'photo' as const };
  const video = { kind: 'video' as const };

  it('takes everything while there is room', () => {
    const result = planPicks({ total: 0, videos: 0 }, [photo, video, photo]);
    expect(result.accepted).toHaveLength(3);
    expect(result.errors).toEqual([]);
  });

  it('stops at 10 photos and videos together', () => {
    const result = planPicks({ total: 9, videos: 0 }, [photo, photo]);
    expect(result.accepted).toHaveLength(1);
    expect(result.errors).toEqual(['Tối đa 10 ảnh và video.']);
  });

  it('allows at most 3 videos but still takes the photos', () => {
    const result = planPicks({ total: 2, videos: 2 }, [video, video, photo]);
    expect(result.accepted).toEqual([video, photo]);
    expect(result.errors).toEqual(['Mỗi đồ có tối đa 3 video.']);
  });
});
