import {
  filtersFromHistory,
  parseSearchFilters,
  toSearchQuery,
  toSearchRouteParams,
} from '../search-params';
import type { SearchFilters } from '@/types/search';

const empty = parseSearchFilters({});

describe('parseSearchFilters', () => {
  it('falls back to the defaults', () => {
    expect(empty).toEqual({ q: '', form: 'all', conditions: [], extras: [], sort: 'rel' });
  });

  it('reads every filter', () => {
    const filters = parseSearchFilters({
      q: '  iphone 13 ',
      form: 'sell',
      category: 'dien-thoai',
      region: 'city',
      conditions: 'like_new,good',
      price: '2m-8m',
      extras: 'video,bargain',
      sort: 'low',
    });
    expect(filters).toEqual({
      q: 'iphone 13',
      form: 'sell',
      category: 'dien-thoai',
      region: 'city',
      conditions: ['like_new', 'good'],
      price: '2m-8m',
      extras: ['video', 'bargain'],
      sort: 'low',
    });
  });

  it('drops values that are not valid', () => {
    const filters = parseSearchFilters({
      form: 'rent',
      region: 'moon',
      extras: 'video,nope',
      sort: 'bids',
    });
    expect(filters.form).toBe('all');
    expect(filters.region).toBeUndefined();
    expect(filters.extras).toEqual(['video']);
    // "bids" is a sort of auctions only
    expect(filters.sort).toBe('rel');
  });

  it('keeps a sort of the form', () => {
    expect(parseSearchFilters({ form: 'auction', sort: 'bids' }).sort).toBe('bids');
  });

  it('takes the first value of a repeated param and cuts a long phrase', () => {
    expect(parseSearchFilters({ form: ['gift', 'sell'] }).form).toBe('gift');
    expect(parseSearchFilters({ q: 'a'.repeat(300) }).q).toHaveLength(120);
  });
});

describe('toSearchQuery', () => {
  it('leaves defaults out', () => {
    expect(toSearchQuery(empty)).toBe('');
    expect(toSearchRouteParams(empty)).toEqual({});
  });

  it('encodes the phrase and lists', () => {
    const filters: SearchFilters = {
      ...empty,
      q: 'máy ảnh & ống',
      form: 'trade',
      conditions: ['good', 'fair'],
      sort: 'new',
    };
    expect(toSearchQuery(filters)).toBe(
      `q=${encodeURIComponent('máy ảnh & ống')}&form=trade&conditions=${encodeURIComponent(
        'good,fair'
      )}&sort=new`
    );
  });

  it('round-trips through the route params', () => {
    const filters: SearchFilters = {
      q: 'đồng hồ cổ',
      form: 'auction',
      category: 'suu-tam',
      region: 'nation',
      conditions: ['fair'],
      price: '1m-5m',
      extras: ['no_bids', 'verified'],
      sort: 'bids',
    };
    expect(parseSearchFilters(toSearchRouteParams(filters))).toEqual(filters);
  });
});

describe('filtersFromHistory', () => {
  it('repeats a search with its saved filters and the default sort', () => {
    const filters = filtersFromHistory({
      id: '1',
      query: 'iphone 13',
      filters: { form: 'sell', conditions: ['good'], price: '2m-8m' },
    });
    expect(filters).toMatchObject({
      q: 'iphone 13',
      form: 'sell',
      conditions: ['good'],
      price: '2m-8m',
      extras: [],
      sort: 'rel',
    });
  });
});
