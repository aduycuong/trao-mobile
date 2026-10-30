import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ConfirmSheet } from '@/components/me/confirm-sheet';
import { UserAvatar } from '@/components/me/user-avatar';
import { AppText } from '@/components/ui/app-text';
import { ErrorBox, SkeletonBlock } from '@/components/ui/form-controls';
import { useAuth } from '@/hooks/useAuth';
import { subscribeListingSignal } from '@/services/chat/rtdb';
import {
  COMMENT_MAX_LENGTH,
  fetchComments,
  listingCommentsKey,
  postComment,
  removeComment,
  setCommentLiked,
} from '@/services/comments/comments-api';
import type { CommentView } from '@/types/comments';
import { formatRelativeTime } from '@/utils/format';

const HEART =
  'M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4z';

type Reply = { commentId: string; name: string };

/**
 * The comments of a listing (canvas Detail, "Bình luận"): a public box, top comments newest first
 * with their replies indented, like and reply on each, and delete on your own. Guests read;
 * writing or liking sends them to sign in.
 */
export function ListingComments({ listingId }: { listingId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, getIdToken } = useAuth();
  const queryKey = listingCommentsKey(listingId, session?.uid);
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [replying, setReplying] = useState<Reply | null>(null);
  const [removing, setRemoving] = useState<CommentView | null>(null);
  const [posting, setPosting] = useState(false);
  const [now] = useState(() => Date.now());

  const { data, error, refetch, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) =>
        fetchComments(listingId, pageParam, session ? await getIdToken() : undefined),
      initialPageParam: 0,
      getNextPageParam: (last) => last.nextOffset ?? undefined,
    });

  // Someone else commented, replied or took a comment down: read the list again.
  useEffect(() => {
    return (
      subscribeListingSignal(
        listingId,
        'comments',
        () => void queryClient.invalidateQueries({ queryKey: ['listing-comments', listingId] })
      ) ?? undefined
    );
  }, [listingId, queryClient]);

  const total = data?.pages[0]?.total ?? 0;
  const comments = data?.pages.flatMap((page) => page.items) ?? [];

  /** True when the user may go on; a guest is sent to the sign-in gate. */
  function requireAuth(): boolean {
    if (session) return true;
    router.push('/auth-gate');
    return false;
  }

  function startReply(comment: CommentView) {
    if (!requireAuth()) return;
    setReplying({ commentId: comment.id, name: comment.authorName ?? 'bình luận' });
    inputRef.current?.focus();
  }

  async function submit() {
    const body = text.trim();
    if (!requireAuth() || !body || posting) return;
    setPosting(true);
    try {
      await postComment(await getIdToken(), listingId, { body, parentId: replying?.commentId });
      setText('');
      setReplying(null);
      await queryClient.invalidateQueries({ queryKey });
    } catch (caught) {
      Alert.alert(
        'Chưa gửi được bình luận',
        caught instanceof Error ? caught.message : 'Bạn thử lại nhé.'
      );
    } finally {
      setPosting(false);
    }
  }

  async function remove(comment: CommentView) {
    try {
      await removeComment(await getIdToken(), comment.id);
      setRemoving(null);
      await queryClient.invalidateQueries({ queryKey });
    } catch (caught) {
      setRemoving(null);
      Alert.alert(
        'Chưa xoá được bình luận',
        caught instanceof Error ? caught.message : 'Bạn thử lại nhé.'
      );
    }
  }

  return (
    <View className="mt-6 gap-3.5 border-t-8 border-[#F2F5F8] px-4 pb-3.5 pt-5">
      <AppText accessibilityRole="header" className="text-[17px] font-vn-bold">
        Bình luận
        {total > 0 ? <AppText className="font-vn-medium text-[#5A6772]"> {total}</AppText> : null}
      </AppText>

      <View className="gap-1.5">
        {replying ? (
          <View className="flex-row items-center gap-2">
            <AppText className="text-[12.5px] text-[#5A6772]">
              Đang trả lời <AppText className="text-[12.5px] font-vn-bold">{replying.name}</AppText>
            </AppText>
            <Pressable accessibilityRole="button" onPress={() => setReplying(null)}>
              <AppText className="text-[12.5px] font-vn-semibold text-[#1673D9]">Huỷ</AppText>
            </Pressable>
          </View>
        ) : null}
        <View
          className={`h-11 flex-row items-center gap-1 rounded-xl border-[1.5px] bg-[#F2F5F8] pl-3.5 pr-1 ${
            replying ? 'border-[#1673D9]' : 'border-transparent'
          }`}
        >
          <TextInput
            ref={inputRef}
            accessibilityLabel="Viết bình luận"
            value={text}
            onChangeText={setText}
            onFocus={() => {
              // A guest reads; writing asks them to sign in first.
              if (!session) {
                inputRef.current?.blur();
                router.push('/auth-gate');
              }
            }}
            maxLength={COMMENT_MAX_LENGTH}
            returnKeyType="send"
            onSubmitEditing={() => void submit()}
            placeholder={replying ? `Trả lời ${replying.name}…` : 'Viết bình luận công khai…'}
            placeholderTextColor="#5A6772"
            className="min-w-0 flex-1 font-vn text-[14px] text-[#0F2440]"
          />
          {text.trim() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gửi bình luận"
              disabled={posting}
              onPress={() => void submit()}
              className={`h-9 justify-center rounded-[10px] bg-[#1673D9] px-3 ${
                posting ? 'opacity-60' : ''
              }`}
            >
              <AppText className="text-[13px] font-vn-bold text-white">Gửi</AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {error && !data ? <ErrorBox message={error.message} onRetry={() => void refetch()} /> : null}

      {isPending ? (
        <View accessibilityLabel="Đang tải bình luận" className="gap-4">
          {Array.from({ length: 2 }, (_, index) => (
            <View key={index} className="flex-row gap-2.5">
              <SkeletonBlock className="h-[30px] w-[30px] rounded-full" />
              <View className="flex-1 gap-1.5">
                <SkeletonBlock className="h-3.5 w-1/3" />
                <SkeletonBlock className="h-4 w-4/5" />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {data && comments.length === 0 ? (
        <AppText className="text-[13.5px] text-[#5A6772]">
          Chưa có bình luận nào. Hãy là người đầu tiên hỏi về món đồ này.
        </AppText>
      ) : null}

      {comments.map((comment) => (
        <View key={comment.id} className="gap-3.5">
          <CommentRow
            comment={comment}
            now={now}
            onReply={startReply}
            onRemove={setRemoving}
            requireAuth={requireAuth}
          />
          {comment.replies.map((reply) => (
            <View key={reply.id} className="pl-10">
              <CommentRow
                comment={reply}
                now={now}
                onReply={startReply}
                onRemove={setRemoving}
                requireAuth={requireAuth}
              />
            </View>
          ))}
        </View>
      ))}

      {hasNextPage ? (
        <Pressable
          accessibilityRole="button"
          disabled={isFetchingNextPage}
          onPress={() => void fetchNextPage()}
          className="h-[42px] items-center justify-center rounded-xl border border-[#E1E7EE] bg-white"
        >
          {isFetchingNextPage ? (
            <ActivityIndicator color="#1673D9" />
          ) : (
            <AppText className="text-[13.5px] font-vn-bold text-[#1673D9]">
              Xem thêm bình luận
            </AppText>
          )}
        </Pressable>
      ) : null}

      {removing ? (
        <ConfirmSheet
          title="Xoá bình luận?"
          description="Bình luận sẽ biến mất khỏi tin. Các câu trả lời bên dưới vẫn còn."
          confirmLabel="Xoá"
          destructive
          onConfirm={() => remove(removing)}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </View>
  );
}

function CommentRow({
  comment,
  now,
  onReply,
  onRemove,
  requireAuth,
}: {
  comment: CommentView;
  now: number;
  onReply: (comment: CommentView) => void;
  onRemove: (comment: CommentView) => void;
  requireAuth: () => boolean;
}) {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [override, setOverride] = useState<{ liked: boolean; likeCount: number } | null>(null);
  const busy = useRef(false);
  const like = override ?? { liked: comment.liked, likeCount: comment.likeCount };

  if (comment.status !== 'ok') {
    return (
      <AppText className="text-[13.5px] italic text-[#8A96A3]">
        {comment.status === 'deleted' ? 'Bình luận đã được xoá.' : 'Bình luận đã bị ẩn.'}
      </AppText>
    );
  }

  async function toggleLike() {
    if (busy.current || !requireAuth()) return;
    busy.current = true;
    const before = like;
    const next = !before.liked;
    setOverride({ liked: next, likeCount: Math.max(0, before.likeCount + (next ? 1 : -1)) });
    try {
      setOverride(await setCommentLiked(await getIdToken(), comment.id, next));
    } catch (caught) {
      setOverride(before);
      Alert.alert(
        'Không thực hiện được',
        caught instanceof Error ? caught.message : 'Thử lại sau.'
      );
    } finally {
      busy.current = false;
    }
  }

  const name = comment.authorName ?? 'Thành viên Trao';

  return (
    <View className="flex-row gap-2.5">
      <UserAvatar
        name={comment.authorName}
        avatarUrl={comment.avatarUrl}
        size={30}
        textClassName="text-[12px]"
      />
      <View className="min-w-0 flex-1 gap-[3px]">
        <View className="flex-row flex-wrap items-center">
          <AppText
            accessibilityRole={comment.authorHandle ? 'link' : undefined}
            onPress={
              comment.authorHandle
                ? () =>
                    router.push({
                      pathname: '/u/[handle]',
                      params: { handle: comment.authorHandle as string },
                    })
                : undefined
            }
            className="text-[13px] font-vn-semibold"
          >
            {name}
          </AppText>
          {comment.byListingOwner ? (
            <View className="ml-1.5 rounded-md bg-[#E6F1FF] px-1.5 py-px">
              <AppText className="text-[11px] text-[#0B4A99]">Người đăng</AppText>
            </View>
          ) : null}
          <AppText className="text-[13px] text-[#5A6772]">
            {' · '}
            {formatRelativeTime(comment.createdAt, now)}
          </AppText>
        </View>
        <AppText className="text-[14px] leading-[21px] text-[#33414D]">{comment.body}</AppText>
        <View className="mt-0.5 flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={like.liked ? 'Bỏ thích bình luận' : 'Thích bình luận'}
            accessibilityState={{ selected: like.liked }}
            onPress={() => void toggleLike()}
            className="min-h-7 flex-row items-center gap-1"
          >
            <Svg
              width={15}
              height={15}
              viewBox="0 0 24 24"
              fill={like.liked ? '#F0533A' : 'none'}
              stroke={like.liked ? '#F0533A' : '#5A6772'}
              strokeWidth={2.2}
              strokeLinejoin="round"
            >
              <Path d={HEART} />
            </Svg>
            <AppText
              className={`text-[12.5px] font-vn-semibold ${
                like.liked ? 'text-[#F0533A]' : 'text-[#5A6772]'
              }`}
            >
              {like.likeCount}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onReply(comment)}
            className="min-h-7 justify-center"
          >
            <AppText className="text-[12.5px] font-vn-semibold text-[#5A6772]">Trả lời</AppText>
          </Pressable>
          {comment.mine ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onRemove(comment)}
              className="min-h-7 justify-center"
            >
              <AppText className="text-[12.5px] font-vn-semibold text-[#5A6772]">Xoá</AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
