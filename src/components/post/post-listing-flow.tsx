import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { AreaStep } from '@/components/onboarding/area-step';
import { ScreenBar } from '@/components/navigation/screen-bar';
import { PolicySheet } from '@/components/post/policy-sheet';
import { StartTimePicker } from '@/components/post/start-time-picker';
import { ItemThumb } from '@/components/stock/item-thumb';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { BarButton, Checkbox, ErrorBox, RadioDot, Switch } from '@/components/ui/form-controls';
import { PathIcon } from '@/components/ui/path-icon';
import { useAuth } from '@/hooks/useAuth';
import { useGoBack } from '@/hooks/useGoBack';
import { toOnboardingLocation } from '@/services/account/account-api';
import {
  checkListing,
  createListing,
  listingQueryKey,
  MY_LISTINGS_QUERY_KEY,
  updateListing,
} from '@/services/listings/listings-api';
import { fetchMyProfile, MY_PROFILE_QUERY_KEY } from '@/services/profile/profile-api';
import { fetchMyItem, itemQueryKey, MY_ITEMS_QUERY_KEY } from '@/services/stock/items-api';
import {
  FORM_CHOICES,
  HANDOVER_METHODS,
  LISTING_AUCTION_DURATIONS,
  LISTING_AUCTION_MAX_LEAD_DAYS,
  LISTING_AUCTION_MIN_LEAD_MINUTES,
  LISTING_HANDOVER_NOTE_MAX_LENGTH,
  LISTING_TRADE_WANTS_MAX_LENGTH,
  type HandoverMethod,
  type ListingCheck,
  type ListingFormFields,
} from '@/types/listings';
import type { OnboardingLocation } from '@/types/onboarding';
import type { ListingType } from '@/types/people';
import type { ItemDetail } from '@/types/stock';
import { formatDayMonth, formatClock } from '@/utils/format';
import {
  buildListingBody,
  canPostAlongside,
  describeMain,
  digitsOnly,
  groupedDigits,
  isStartValid,
  type ListingDraft,
} from '@/utils/listing-rules';
import { StackSkeleton } from '@/components/ui/skeletons';
import { useBottomInset } from '@/hooks/useBottomInset';

type Step = 'listing' | 'check' | 'area' | 'done';

const POLICY_LABEL: Record<ListingType, string> = {
  sell: 'Quy định khi mua bán',
  trade: 'Quy định trao đổi',
  gift: 'Quy định cho tặng',
  auction: 'Quy định đấu giá',
};

const SHIPS: Record<HandoverMethod, { label: string; sub: string; icon: string }> = {
  meet: {
    label: 'Trực tiếp',
    sub: 'Hai bên gặp nhau giao nhận',
    icon: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  },
  ship: {
    label: 'Gửi hàng',
    sub: 'Gửi qua đơn vị vận chuyển',
    icon: 'M2 6h11v10H2zM13 9h4l3 3v4h-7M5 18a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0M15 18a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 1 0-3.6 0',
  },
};

const BIDDERS = [
  {
    level: 1 as const,
    title: 'Mọi thành viên',
    sub: 'Ai có tài khoản Trao đều đặt giá được',
    tag: 'Mặc định',
    off: false,
  },
  {
    level: 2 as const,
    title: 'Chỉ tài khoản Đã xác thực',
    sub: 'Đã xác minh số điện thoại · giảm đặt giá ảo',
    tag: '',
    off: false,
  },
  {
    level: 0 as const,
    title: 'Thành viên một nhóm',
    sub: 'Chỉ người trong nhóm bạn chọn',
    tag: 'Sắp có',
    off: true,
  },
];

const LEVELS = [
  {
    icon: '0',
    title: 'Khách',
    sub: 'Chưa đăng nhập. Xem được chợ, chưa đặt giá được.',
    tag: '',
    bg: '#F2F5F8',
    fg: '#5A6772',
  },
  {
    icon: '1',
    title: 'Thành viên',
    sub: 'Đã đăng ký tài khoản.',
    tag: '',
    bg: '#E6F1FF',
    fg: '#0B4A99',
  },
  {
    icon: '✓',
    title: 'Đã xác thực',
    sub: 'Đã xác minh số điện thoại.',
    tag: '',
    bg: '#E3F4EA',
    fg: '#2F9E63',
  },
  {
    icon: 'ID',
    title: 'Đã định danh',
    sub: 'Đã xác minh danh tính.',
    tag: 'Sắp có',
    bg: '#F2F5F8',
    fg: '#5A6772',
  },
];

const OUTCOME = {
  pending_review: {
    title: 'Tin đang chờ duyệt',
    text: 'Trao kiểm tra tin trong vài phút. Duyệt xong tin tự hiện lên chợ và bạn sẽ nhận thông báo.',
    pill: 'Chờ duyệt',
  },
  // An edit of a listing on the market: it waits for review while the approved version stays on show.
  published: {
    title: 'Đã gửi bản sửa',
    text: 'Trao duyệt bản sửa trong vài phút. Trong lúc chờ, tin vẫn hiện bản đã duyệt trên chợ.',
    pill: 'Đang đăng',
  },
  scheduled: {
    title: 'Đã gửi bản sửa',
    text: 'Trao duyệt bản sửa trong vài phút. Phiên vẫn giữ giờ bắt đầu và nội dung đã duyệt đến khi bản sửa được duyệt.',
    pill: 'Sắp bắt đầu',
  },
} as const;

type PostListingFlowProps = {
  itemId: string;
  /** `stock`: opened from the item (2 steps); `new`: right after Thêm đồ (3 steps); `edit`: a listing already made (2 steps). */
  from: 'stock' | 'new' | 'edit';
  initialType?: ListingType;
  /** The listing being edited, sent again or posted again. Its form is filled and cannot change. */
  listingId?: string;
  prefill?: ListingFormFields;
  /** Screen title: "Đăng tin" (default), "Sửa tin", "Đăng lại". */
  title?: string;
};

/** Đăng tin steps 2 and 3 plus the "sent" screen (canvas Post: listing, check, done). */
export function PostListingFlow({
  itemId,
  from,
  initialType,
  listingId,
  prefill,
  title = 'Đăng tin',
}: PostListingFlowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomInset();
  const { session, getIdToken } = useAuth();
  const goBack = useGoBack({ pathname: '/stock/[id]', params: { id: itemId } });

  const [step, setStep] = useState<Step>('listing');
  const [chosenType, setType] = useState<ListingType>(initialType ?? 'sell');
  /** The area picked for this listing; absent, the listing keeps its own (edit) or takes the owner's (new). */
  const [areaPick, setAreaPick] = useState<{ location: OnboardingLocation; name: string } | null>(
    null
  );
  const [price, setPrice] = useState(prefill?.price ? String(prefill.price) : '');
  const [allowOffers, setAllowOffers] = useState(prefill ? prefill.allowOffers : true);
  const [tradeWants, setTradeWants] = useState(prefill?.tradeWants ?? '');
  const [increment, setIncrement] = useState(
    prefill?.minIncrement ? String(prefill.minIncrement) : ''
  );
  const [days, setDays] = useState<1 | 3 | 7>(
    LISTING_AUCTION_DURATIONS.find((value) => value === prefill?.durationDays) ?? 3
  );
  const [bidderLevel, setBidderLevel] = useState<1 | 2>(prefill?.minBidderLevel === 2 ? 2 : 1);
  const [scheduled, setScheduled] = useState(Boolean(prefill?.startsAt));
  const [initialStart] = useState<Date | null>(() =>
    prefill?.startsAt ? new Date(prefill.startsAt) : null
  );
  const [startsAt, setStartsAt] = useState<Date | null>(initialStart);
  const [methods, setMethods] = useState<HandoverMethod[]>(
    prefill
      ? HANDOVER_METHODS.filter((method) => prefill.handoverMethods.includes(method))
      : ['meet', 'ship']
  );
  const [note, setNote] = useState(prefill?.handoverNote ?? '');
  const [outcome, setOutcome] = useState<'pending_review' | 'published' | 'scheduled'>(
    'pending_review'
  );
  const [confirmed, setConfirmed] = useState<[boolean, boolean]>([false, false]);
  const [levelsOpen, setLevelsOpen] = useState(false);
  /** The policy being read in a sheet over the check step. */
  const [policy, setPolicy] = useState<'listing-guidelines' | 'four-forms' | null>(null);
  // Fixed when the screen opens, so the picker's limits do not move while choosing.
  const [now] = useState(() => Date.now());

  const {
    data: item,
    error: itemError,
    isPending,
  } = useQuery({
    queryKey: itemQueryKey(itemId, session?.uid),
    queryFn: async () => fetchMyItem(await getIdToken(), itemId),
    enabled: !!session,
  });
  const { data: profile } = useQuery({
    queryKey: [...MY_PROFILE_QUERY_KEY, session?.uid],
    queryFn: async () => fetchMyProfile(await getIdToken()),
    enabled: !!session,
  });

  // An item has one listing, or a sell and a trade together. A form that cannot join the listings it
  // has (waiting, rejected or live) is locked: they are edited from Tin đăng. A closed auction row
  // is reopened from there, so auction is taken too.
  const openTypes = listingId
    ? []
    : (item?.listings ?? [])
        .filter((entry) => entry.status !== 'closed')
        .map((entry) => entry.type);
  const closedAuction =
    !listingId &&
    (item?.listings ?? []).some((entry) => entry.type === 'auction' && entry.status === 'closed');
  const isLocked = (candidate: ListingType) =>
    !canPostAlongside(candidate, openTypes) || (candidate === 'auction' && closedAuction);
  const type = isLocked(chosenType)
    ? (FORM_CHOICES.find((entry) => !isLocked(entry.type))?.type ?? chosenType)
    : chosenType;
  const allTaken = FORM_CHOICES.every((entry) => isLocked(entry.type));

  const stepLabel = {
    listing: from === 'new' ? 'Bước 2/3' : 'Bước 1/2',
    check: from === 'new' ? 'Bước 3/3' : 'Bước 2/2',
  } as const;

  const draft: ListingDraft = {
    itemId,
    type,
    price,
    allowOffers,
    tradeWants,
    increment,
    days,
    bidderLevel,
    scheduled,
    startsAt,
    methods,
    note,
    area: areaPick?.location ?? null,
  };
  const body = allTaken ? null : buildListingBody(draft);

  const check = useQuery({
    queryKey: ['listing-check', listingId ?? null, JSON.stringify(body), session?.uid],
    queryFn: async () => checkListing(await getIdToken(), { ...body!, listingId }),
    enabled: step === 'check' && body !== null,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const token = await getIdToken();
      return listingId
        ? updateListing(token, listingId, { ...body!, confirmed: true })
        : createListing(token, { ...body!, confirmed: true });
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['item', itemId] }),
        queryClient.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: MY_LISTINGS_QUERY_KEY }),
        ...(listingId
          ? [queryClient.invalidateQueries({ queryKey: listingQueryKey(listingId, session?.uid) })]
          : []),
      ]);
      setOutcome(result.status);
      setStep('done');
    },
    onError: (caught) => Alert.alert('Chưa gửi được tin', caught.message || 'Thử lại sau.'),
  });

  if (isPending) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StepBar title="Đăng tin" label="" onBack={goBack} />
        <StackSkeleton blocks={['h-[84px] rounded-2xl', 'h-28 rounded-2xl', 'h-14 rounded-xl']} />
      </View>
    );
  }
  if (itemError || !item) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <ErrorBox message={itemError?.message ?? 'Không tìm thấy món.'} onBack={goBack} />
      </View>
    );
  }

  const areaName = areaPick?.name ?? prefill?.areaName ?? profile?.areaName ?? null;
  const shipText = [
    ...methods.map((method) => SHIPS[method].label),
    ...(areaName ? [areaName] : []),
  ].join(' · ');
  const mainText = describeMain(draft);
  const formLabel = FORM_CHOICES.find((entry) => entry.type === type)!.label;

  if (step === 'area') {
    return (
      <AreaStep
        header={<ScreenBar title="Khu vực đăng tin" onBack={() => setStep('listing')} />}
        title="Khu vực đăng tin"
        description="Người xem chỉ thấy phường/xã và tỉnh/thành của tin, không thấy vị trí chính xác."
        submitLabel="Dùng khu vực này"
        onBack={() => setStep('listing')}
        onPicked={(resolved) => {
          setAreaPick({ location: toOnboardingLocation(resolved), name: resolved.name });
          setStep('listing');
        }}
      />
    );
  }

  if (step === 'done') {
    const pending = outcome === 'pending_review';
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <ScrollView contentContainerClassName="items-center gap-3 px-6 pb-6 pt-[72px]">
          <View
            className={`h-[88px] w-[88px] items-center justify-center rounded-full ${
              pending ? 'bg-[#FFF4D6]' : 'bg-[#E3F4EA]'
            }`}
          >
            <Svg
              width={44}
              height={44}
              viewBox="0 0 24 24"
              fill="none"
              stroke={pending ? '#E8A200' : '#2F9E63'}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {pending ? (
                <>
                  <Circle cx={12} cy={12} r={9} />
                  <Path d="M12 7v5l3 2" />
                </>
              ) : (
                <Path d="M5 12l5 5 9-10" />
              )}
            </Svg>
          </View>
          <AppText accessibilityRole="header" className="mt-2 text-center text-[22px] font-vn-bold">
            {OUTCOME[outcome].title}
          </AppText>
          <AppText className="text-center text-[14.5px] leading-[22.5px] text-[#5A6772]">
            {OUTCOME[outcome].text}
          </AppText>
          <AppText className="rounded-xl bg-[#F1F7FE] px-3 py-2.5 text-[13px] leading-[19.5px] text-[#33414D]">
            Tin hoạt động nhiều được ưu tiên hiện. Bạn có thể làm mới tin 3 ngày một lần để đưa tin
            lên lại.
          </AppText>
          <View className="mt-3 flex-row items-center gap-3 self-stretch rounded-[14px] border border-[#E1E7EE] p-3">
            <ItemThumb
              url={item.photos[0]?.thumbUrl ?? null}
              categorySlug={item.categorySlug}
              width={44}
              height={50}
              radius={10}
              iconSize={28}
            />
            <View className="min-w-0 flex-1 gap-0.5">
              <AppText numberOfLines={1} className="text-[13.5px] font-vn-semibold">
                {item.title}
              </AppText>
              <AppText className="text-[12.5px] text-[#5A6772]">
                {formLabel} · {mainText}
              </AppText>
            </View>
            <View
              className={`h-[26px] flex-row items-center gap-[5px] rounded-full px-2.5 ${
                pending ? 'bg-[#FFF4D6]' : 'bg-[#E6F1FF]'
              }`}
            >
              <View
                className={`h-1.5 w-1.5 rounded-full ${pending ? 'bg-[#E8A200]' : 'bg-[#1673D9]'}`}
              />
              <AppText
                className={`text-[12px] font-vn-bold ${pending ? 'text-[#8A5A00]' : 'text-[#0B4A99]'}`}
              >
                {OUTCOME[outcome].pill}
              </AppText>
            </View>
          </View>
        </ScrollView>
        <View className="flex-row gap-2 px-4 pt-2.5" style={{ paddingBottom: 18 + bottomInset }}>
          <BarButton label="Về trang chủ" tone="outline" onPress={() => router.replace('/')} />
          <BarButton
            label="Xem trong Tin đăng"
            flex={1.3}
            onPress={() => router.replace('/listings')}
          />
        </View>
      </View>
    );
  }

  if (step === 'check') {
    const result = check.data;
    const ready = confirmed[0] && confirmed[1] && result !== undefined && !result.blocked;
    const confirms = [
      'Đây là đồ thật của tôi, ảnh chụp thật, tình trạng đúng như mô tả.',
      `Tôi đã đọc và đồng ý Nguyên tắc tin đăng và ${POLICY_LABEL[type].charAt(0).toLowerCase()}${POLICY_LABEL[type].slice(1)}.`,
    ];
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <StepBar
          title="Kiểm tra trước khi đăng"
          label={stepLabel.check}
          onBack={() => setStep('listing')}
        />
        <ScrollView
          contentContainerClassName="gap-5 px-4 pb-6 pt-3.5"
          showsVerticalScrollIndicator={false}
        >
          <SummaryCard item={item} formLabel={formLabel} mainText={mainText} shipText={shipText} />

          <View className="gap-2.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Trao đã kiểm tra
            </AppText>
            {check.isPending ? (
              <View accessibilityLabel="Đang kiểm tra" className="items-center py-6">
                <ActivityIndicator color="#1673D9" />
              </View>
            ) : null}
            {check.error ? (
              <View accessibilityRole="alert" className="rounded-2xl bg-[#FDECEA] px-4 py-3">
                <AppText className="text-[14px] text-[#B42318]">{check.error.message}</AppText>
                <Pressable onPress={() => setStep('listing')} className="mt-1.5">
                  <AppText className="text-[14px] font-vn-semibold text-[#B42318] underline">
                    Sửa lại
                  </AppText>
                </Pressable>
              </View>
            ) : null}
            {result ? (
              <View className="overflow-hidden rounded-2xl border border-[#E1E7EE]">
                {result.checks.map((entry, index) => (
                  <CheckRow key={`${entry.code}-${index}`} entry={entry} first={index === 0} />
                ))}
              </View>
            ) : null}
          </View>

          <View className="gap-2.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Bạn xác nhận
            </AppText>
            {confirms.map((text, index) => (
              <Pressable
                key={text}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmed[index] }}
                onPress={() =>
                  setConfirmed((current) =>
                    index === 0 ? [!current[0], current[1]] : [current[0], !current[1]]
                  )
                }
                className="flex-row items-start gap-3"
              >
                <View className="mt-px">
                  <Checkbox on={confirmed[index]!} />
                </View>
                <AppText className="flex-1 text-[14px] leading-[21px]">{text}</AppText>
              </Pressable>
            ))}
            <AppText className="text-[13px] text-[#5A6772]">
              Đọc{' '}
              <AppText
                onPress={() => setPolicy('listing-guidelines')}
                className="text-[13px] font-vn-semibold text-[#1673D9]"
              >
                Nguyên tắc tin đăng
              </AppText>{' '}
              ·{' '}
              <AppText
                onPress={() => setPolicy('four-forms')}
                className="text-[13px] font-vn-semibold text-[#1673D9]"
              >
                {POLICY_LABEL[type]}
              </AppText>
            </AppText>
          </View>
        </ScrollView>
        <View
          className="gap-2 border-t border-[#E8ECF0] bg-white px-4 pt-2.5"
          style={{ paddingBottom: 18 + bottomInset }}
        >
          <BarButton
            label="Đăng tin"
            disabled={!ready}
            loading={submit.isPending}
            onPress={() => submit.mutate()}
          />
          <AppText className="text-center text-[12.5px] leading-[18px] text-[#5A6772]">
            Tin đăng sẽ được kiểm duyệt trước khi hiện lên chợ, thường trong vài phút.
          </AppText>
        </View>
        {policy ? <PolicySheet slug={policy} onClose={() => setPolicy(null)} /> : null}
      </View>
    );
  }

  const startsAtValid = !scheduled || isStartValid(startsAt, now, initialStart);
  const canNext = body !== null && startsAtValid;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <StepBar title={title} label={stepLabel.listing} onBack={goBack} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-[22px] px-4 pb-6 pt-3.5"
      >
        <View className="flex-row items-center gap-3 rounded-2xl bg-[#F1F7FE] p-2.5">
          <ItemThumb
            url={item.photos[0]?.thumbUrl ?? null}
            categorySlug={item.categorySlug}
            width={56}
            height={64}
            radius={12}
            iconSize={34}
          />
          <View className="min-w-0 flex-1 gap-[3px]">
            <AppText numberOfLines={2} className="text-[14.5px] font-vn-semibold leading-[19.5px]">
              {item.title}
            </AppText>
            <AppText className="text-[12.5px] text-[#5A6772]">
              {item.conditionLabel}
              {item.categoryName ? ` · ${item.categoryName}` : ''}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/stock/[id]/edit', params: { id: item.id } })}
            className="h-[34px] justify-center rounded-[10px] bg-white px-3"
          >
            <AppText className="text-[13px] font-vn-bold text-[#1673D9]">Sửa</AppText>
          </Pressable>
        </View>

        {!listingId ? (
          <View className="gap-2.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Hình thức
            </AppText>
            <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
              {FORM_CHOICES.map((entry) => {
                const locked = isLocked(entry.type);
                // The badge says this form has its own listing; a form locked only because it cannot join the others has none.
                const hasOwn =
                  openTypes.includes(entry.type) || (entry.type === 'auction' && closedAuction);
                const on = !locked && entry.type === type;
                return (
                  <Pressable
                    key={entry.type}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled: locked }}
                    onPress={() => {
                      if (!locked) setType(entry.type);
                    }}
                    style={{ width: '48.7%' }}
                    className={`gap-1.5 rounded-[14px] border-[1.5px] p-3 ${
                      on ? 'border-[#1673D9] bg-[#F1F7FE]' : 'border-[#E1E7EE] bg-white'
                    } ${locked ? 'opacity-50' : ''}`}
                  >
                    <View className="flex-row items-center gap-1.5 pr-6">
                      <AppText className="text-[15px] font-vn-bold">{entry.label}</AppText>
                      {hasOwn ? (
                        <View className="h-5 justify-center rounded-full bg-[#F2F5F8] px-2">
                          <AppText className="text-[11px] font-vn-bold text-[#5A6772]">
                            Đã có tin
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                    <AppText className="text-[12px] leading-[16.2px] text-[#5A6772]">
                      {entry.sub}
                    </AppText>
                    <View className="absolute right-2.5 top-2.5">
                      <RadioDot on={on} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {FORM_CHOICES.some((entry) => isLocked(entry.type)) ? (
              <AppText className="text-[12.5px] text-[#5A6772]">
                Một đồ chỉ có một tin, trừ Bán và Trao đổi đăng cùng lúc được.{' '}
                {allTaken ? 'Chỉnh sửa hoặc đóng tin ở tab Tin đăng để đăng hình thức khác.' : ''}
              </AppText>
            ) : null}
          </View>
        ) : null}

        {type === 'sell' ? (
          <View className="gap-2.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Giá bán
            </AppText>
            <MoneyField value={price} onChange={setPrice} label="Giá bán" large />
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: allowOffers }}
              onPress={() => setAllowOffers((on) => !on)}
              className="flex-row items-center gap-3"
            >
              <View className="flex-1 gap-px">
                <AppText className="text-[14px] font-vn-semibold">Cho trả giá</AppText>
                <AppText className="text-[12.5px] text-[#5A6772]">
                  Người mua gửi giá khác, bạn đồng ý hoặc từ chối
                </AppText>
              </View>
              <Switch on={allowOffers} />
            </Pressable>
          </View>
        ) : null}

        {type === 'trade' ? (
          <View className="gap-2.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Muốn đổi lấy
            </AppText>
            <TextInput
              accessibilityLabel="Muốn đổi lấy"
              value={tradeWants}
              maxLength={LISTING_TRADE_WANTS_MAX_LENGTH}
              onChangeText={setTradeWants}
              placeholder="Ví dụ: iPad, Apple Watch, hoặc máy ảnh film"
              placeholderTextColor="#8A96A3"
              multiline
              textAlignVertical="top"
              className="min-h-[52px] rounded-xl border-[1.5px] border-[#D5DDE5] px-3.5 py-3 font-vn text-[14.5px] leading-[22px] text-[#0F2440]"
            />
            <AppText className="text-[12.5px] text-[#5A6772]">
              Người khác đề nghị bằng đồ trong Kho đồ của họ.
            </AppText>
          </View>
        ) : null}

        {type === 'gift' ? (
          <View className="gap-1.5 rounded-2xl bg-[#FFF4D6] p-3.5">
            <AppText className="text-[14px] font-vn-bold text-[#8A5A00]">Cho tặng</AppText>
            <AppText className="text-[13.5px] leading-[20px] text-[#3D2A00]">
              Không cần nhập gì thêm. Mọi người đăng ký nhận, bạn chọn một người và hẹn qua chat.
            </AppText>
          </View>
        ) : null}

        {type === 'auction' ? (
          <View className="gap-3.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Phiên đấu giá
            </AppText>
            <View className="flex-row gap-2">
              <View className="flex-1 gap-1.5">
                <AppText className="text-[13px] font-vn-semibold">Giá khởi điểm</AppText>
                <MoneyField value={price} onChange={setPrice} label="Giá khởi điểm" />
              </View>
              <View className="flex-1 gap-1.5">
                <AppText className="text-[13px] font-vn-semibold">Bước giá</AppText>
                <MoneyField value={increment} onChange={setIncrement} label="Bước giá" />
              </View>
            </View>
            <View className="gap-2">
              <AppText className="text-[13px] font-vn-semibold">Thời gian phiên</AppText>
              <View className="flex-row gap-2">
                {LISTING_AUCTION_DURATIONS.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: value === days }}
                    onPress={() => setDays(value)}
                    className={`h-10 flex-1 items-center justify-center rounded-[10px] border-[1.5px] ${
                      value === days ? 'border-[#1673D9] bg-[#F1F7FE]' : 'border-[#D5DDE5] bg-white'
                    }`}
                  >
                    <AppText className="text-[13.5px] font-vn-semibold">{value} ngày</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="gap-2">
              <AppText className="text-[13px] font-vn-semibold">Bắt đầu</AppText>
              <View
                accessibilityLabel="Bắt đầu"
                accessibilityRole="radiogroup"
                className="flex-row gap-2"
              >
                {(
                  [
                    ['Ngay khi được duyệt', false],
                    ['Hẹn giờ', true],
                  ] as const
                ).map(([label, later]) => (
                  <Pressable
                    key={label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: scheduled === later }}
                    onPress={() => setScheduled(later)}
                    className={`h-10 flex-1 items-center justify-center rounded-[10px] border-[1.5px] ${
                      scheduled === later
                        ? 'border-[#1673D9] bg-[#F1F7FE]'
                        : 'border-[#D5DDE5] bg-white'
                    }`}
                  >
                    <AppText className="text-[13.5px] font-vn-semibold">{label}</AppText>
                  </Pressable>
                ))}
              </View>
              {scheduled ? (
                <StartTimePicker value={startsAt} now={now} onChange={setStartsAt} />
              ) : null}
              {scheduled && startsAt && startsAtValid ? (
                <AppText className="text-[12.5px] font-vn-semibold text-[#0B4A99]">
                  Bắt đầu lúc {formatClock(startsAt.toISOString())} {formatDayMonth(startsAt)}
                </AppText>
              ) : null}
              {scheduled && startsAt && !startsAtValid ? (
                <AppText accessibilityRole="alert" className="text-[12.5px] text-[#B42318]">
                  Chọn giờ từ {LISTING_AUCTION_MIN_LEAD_MINUTES} phút đến{' '}
                  {LISTING_AUCTION_MAX_LEAD_DAYS} ngày tới.
                </AppText>
              ) : null}
              <AppText className="text-[12.5px] text-[#5A6772]">
                {scheduled
                  ? 'Phiên bắt đầu đúng giờ hẹn nếu tin đã được duyệt, nếu chưa thì bắt đầu khi tin được duyệt. '
                  : 'Bắt đầu khi tin được duyệt. '}
                Phiên đã bắt đầu thì không sửa, không huỷ.
              </AppText>
            </View>
            <View accessibilityRole="radiogroup" className="gap-2">
              <View className="flex-row items-baseline gap-2">
                <AppText className="flex-1 text-[13px] font-vn-semibold">Ai được đặt giá</AppText>
                <Pressable accessibilityRole="button" onPress={() => setLevelsOpen(true)}>
                  <AppText className="text-[13px] font-vn-semibold text-[#1673D9]">
                    Các mức thành viên là gì?
                  </AppText>
                </Pressable>
              </View>
              {BIDDERS.map((option) => {
                const on = !option.off && option.level === bidderLevel;
                return (
                  <Pressable
                    key={option.title}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on, disabled: option.off }}
                    onPress={() => {
                      if (!option.off && option.level !== 0) setBidderLevel(option.level);
                    }}
                    className={`min-h-[60px] flex-row items-center gap-3 rounded-[14px] border-[1.5px] px-3.5 py-2.5 ${
                      on ? 'border-[#1673D9] bg-[#F1F7FE]' : 'border-[#E1E7EE] bg-white'
                    } ${option.off ? 'opacity-[0.55]' : ''}`}
                  >
                    <RadioDot on={on} />
                    <View className="min-w-0 flex-1 gap-0.5">
                      <View className="flex-row items-center gap-1.5">
                        <AppText className="text-[14px] font-vn-semibold">{option.title}</AppText>
                        {option.tag ? (
                          <View
                            className={`h-5 justify-center rounded-full px-2 ${
                              option.off ? 'bg-[#F2F5F8]' : 'bg-[#E6F1FF]'
                            }`}
                          >
                            <AppText
                              className={`text-[11px] font-vn-bold ${
                                option.off ? 'text-[#5A6772]' : 'text-[#0B4A99]'
                              }`}
                            >
                              {option.tag}
                            </AppText>
                          </View>
                        ) : null}
                      </View>
                      <AppText className="text-[12.5px] leading-[18px] text-[#5A6772]">
                        {option.sub}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
              <AppText className="text-[12.5px] leading-[18.75px] text-[#5A6772]">
                Ai cũng xem được phiên. Người chưa đủ điều kiện thấy lý do khi bấm Đặt giá.
              </AppText>
            </View>
          </View>
        ) : null}

        <View className="gap-2.5">
          <View className="gap-0.5">
            <AppText accessibilityRole="header" className="text-[15px] font-vn-bold">
              Hình thức giao nhận
            </AppText>
            <AppText className="text-[12.5px] text-[#5A6772]">Chọn một hoặc cả hai</AppText>
          </View>
          <View className="gap-2">
            {HANDOVER_METHODS.map((method) => {
              const on = methods.includes(method);
              return (
                <Pressable
                  key={method}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() =>
                    setMethods((current) =>
                      current.includes(method)
                        ? current.filter((entry) => entry !== method)
                        : [...current, method]
                    )
                  }
                  className={`flex-row items-center gap-3 rounded-[14px] border-[1.5px] p-3 ${
                    on ? 'border-[#1673D9] bg-[#F1F7FE]' : 'border-[#E1E7EE] bg-white'
                  }`}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                    <PathIcon d={SHIPS[method].icon} size={22} color="#1673D9" />
                  </View>
                  <View className="flex-1 gap-px">
                    <AppText className="text-[14.5px] font-vn-bold">{SHIPS[method].label}</AppText>
                    <AppText className="text-[12.5px] text-[#5A6772]">{SHIPS[method].sub}</AppText>
                  </View>
                  <Checkbox on={on} />
                </Pressable>
              );
            })}
          </View>
          <View className="gap-1.5">
            <AppText className="text-[13px] font-vn-semibold">
              Ghi chú giao nhận{' '}
              <AppText className="text-[13px] text-[#5A6772]">(không bắt buộc)</AppText>
            </AppText>
            <TextInput
              accessibilityLabel="Ghi chú giao nhận"
              value={note}
              maxLength={LISTING_HANDOVER_NOTE_MAX_LENGTH}
              onChangeText={setNote}
              placeholder="Ví dụ: Gặp ở Vincom Thủ Đức sau 18h. Gửi hàng thì ship COD."
              placeholderTextColor="#8A96A3"
              multiline
              textAlignVertical="top"
              className="min-h-12 rounded-xl border-[1.5px] border-[#D5DDE5] px-3.5 py-3 font-vn text-[14px] leading-[21px] text-[#0F2440]"
            />
          </View>
          {areaName ? (
            <View className="flex-row items-center gap-1.5">
              <PathIcon d={SHIPS.meet.icon} size={14} color="#5A6772" />
              <AppText className="flex-1 text-[12.5px] text-[#5A6772]">
                {areaName} ·{' '}
                <AppText
                  onPress={() => setStep('area')}
                  className="text-[12.5px] font-vn-semibold text-[#1673D9]"
                >
                  Đổi
                </AppText>
              </AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        className="border-t border-[#E8ECF0] bg-white px-4 pt-2.5"
        style={{ paddingBottom: 18 + bottomInset }}
      >
        <BarButton label="Tiếp: Kiểm tra" disabled={!canNext} onPress={() => setStep('check')} />
      </View>

      {levelsOpen ? (
        <BottomSheet title="Các mức thành viên" onClose={() => setLevelsOpen(false)}>
          <AppText className="-mt-2 text-[13.5px] leading-[20px] text-[#5A6772]">
            Mức tài khoản hiện trên hồ sơ của mỗi người. Mức cao hơn gồm điều kiện của mức thấp hơn.
          </AppText>
          <View className="overflow-hidden rounded-2xl border border-[#E6ECF2]">
            {LEVELS.map((level, index) => (
              <View
                key={level.title}
                className={`flex-row items-start gap-3 px-3.5 py-3 ${
                  index > 0 ? 'border-t border-[#F2F5F8]' : ''
                } ${level.tag ? 'opacity-60' : ''}`}
              >
                <View
                  className="h-[34px] w-[34px] items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: level.bg }}
                >
                  <AppText className="text-[13px] font-vn-bold" style={{ color: level.fg }}>
                    {level.icon}
                  </AppText>
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <View className="flex-row items-center gap-1.5">
                    <AppText className="text-[14.5px] font-vn-bold">{level.title}</AppText>
                    {level.tag ? (
                      <View className="h-5 justify-center rounded-full bg-[#F2F5F8] px-2">
                        <AppText className="text-[11px] font-vn-bold text-[#5A6772]">
                          {level.tag}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <AppText className="text-[13px] leading-[18.85px] text-[#5A6772]">
                    {level.sub}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
          <AppText className="text-[12.5px] leading-[18.75px] text-[#5A6772]">
            Số điện thoại chỉ dùng để xác thực, không hiện công khai.
          </AppText>
          <BarButton label="Đã hiểu" onPress={() => setLevelsOpen(false)} />
        </BottomSheet>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function StepBar({ title, label, onBack }: { title: string; label: string; onBack: () => void }) {
  return (
    <View className="h-[60px] flex-row items-center gap-1.5 border-b border-[#EEF2F6] bg-white pl-1 pr-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={onBack}
        className="h-11 w-11 items-center justify-center"
      >
        <PathIcon d="M15 5l-7 7 7 7" size={22} strokeWidth={2.2} />
      </Pressable>
      <AppText accessibilityRole="header" className="flex-1 text-[18px] font-vn-bold">
        {title}
      </AppText>
      <AppText className="text-[13px] font-vn-semibold text-[#5A6772]">{label}</AppText>
    </View>
  );
}

function MoneyField({
  value,
  onChange,
  label,
  large,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  large?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      className={`flex-row items-center rounded-xl border-[1.5px] bg-white px-3 ${
        focused ? 'border-[#1673D9]' : 'border-[#D5DDE5]'
      } ${large ? 'h-[52px] px-3.5' : 'h-12'}`}
    >
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        value={groupedDigits(value)}
        onChangeText={(text) => onChange(digitsOnly(text))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="0"
        placeholderTextColor="#B8C4D0"
        className={`min-w-0 flex-1 p-0 font-vn-bold text-[#0F2440] ${large ? 'text-[20px]' : 'text-[16px]'}`}
      />
      <AppText className={`ml-1 text-[#5A6772] ${large ? 'text-[16px]' : 'text-[14px]'}`}>
        đ
      </AppText>
    </View>
  );
}

function SummaryCard({
  item,
  formLabel,
  mainText,
  shipText,
}: {
  item: ItemDetail;
  formLabel: string;
  mainText: string;
  shipText: string;
}) {
  return (
    <View className="flex-row gap-3 rounded-2xl border border-[#E1E7EE] p-3">
      <ItemThumb
        url={item.photos[0]?.thumbUrl ?? null}
        categorySlug={item.categorySlug}
        width={64}
        height={76}
        radius={12}
        iconSize={40}
      />
      <View className="min-w-0 flex-1 gap-1">
        <View className="self-start rounded-full bg-[#E6F1FF] px-2 py-0.5">
          <AppText className="text-[11.5px] font-vn-bold text-[#0B4A99]">{formLabel}</AppText>
        </View>
        <AppText numberOfLines={2} className="text-[14.5px] font-vn-semibold leading-[19.5px]">
          {item.title}
        </AppText>
        <AppText className="text-[14px] font-vn-bold text-[#1673D9]">{mainText}</AppText>
        <AppText className="text-[12.5px] text-[#5A6772]">{shipText}</AppText>
      </View>
    </View>
  );
}

function CheckRow({ entry, first }: { entry: ListingCheck; first: boolean }) {
  const style =
    entry.result === 'block'
      ? { icon: '✕', iconBg: '#B42318', bg: '#FDECEA' }
      : entry.result === 'hint'
        ? { icon: '!', iconBg: '#E8A200', bg: '#FFF9EA' }
        : { icon: '✓', iconBg: '#2F9E63', bg: '#FFFFFF' };
  return (
    <View
      className={`flex-row gap-3 px-3.5 py-3 ${first ? '' : 'border-t border-[#EEF2F6]'}`}
      style={{ backgroundColor: style.bg }}
    >
      <View
        className="h-6 w-6 items-center justify-center rounded-full"
        style={{ backgroundColor: style.iconBg }}
      >
        <AppText className="text-[13px] font-vn-bold text-white">{style.icon}</AppText>
      </View>
      <View className="flex-1 gap-0.5">
        <AppText className="text-[14px] font-vn-semibold">{entry.title}</AppText>
        <AppText className="text-[12.5px] leading-[18px] text-[#5A6772]">{entry.detail}</AppText>
      </View>
    </View>
  );
}
