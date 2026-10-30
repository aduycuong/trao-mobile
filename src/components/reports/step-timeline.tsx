import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';

export type TimelineStep = { title: string; detail: string; done: boolean; current: boolean };

/** The vertical steps of a report and of an appeal (canvas Report "status", Penalty "sent"). */
export function StepTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View>
      {steps.map((step, index) => {
        const active = step.done || step.current;
        const last = index === steps.length - 1;
        return (
          <View key={step.title} className="flex-row gap-3">
            <View className="w-[22px] items-center">
              <View
                className={`h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                  active ? 'border-[#1673D9]' : 'border-[#C3CCD6]'
                } ${step.done ? 'bg-[#1673D9]' : 'bg-white'}`}
              >
                {step.done ? (
                  <Svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth={3.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M5 12l5 5 9-10" />
                  </Svg>
                ) : null}
              </View>
              <View
                className="w-0.5 flex-1"
                style={{
                  minHeight: 14,
                  backgroundColor: last ? 'transparent' : step.done ? '#1673D9' : '#E1E7ED',
                }}
              />
            </View>
            <View className="flex-1 gap-0.5 pb-4">
              <AppText
                className={`text-[14.5px] font-vn-semibold ${
                  active ? 'text-[#0F2440]' : 'text-[#A3AEB9]'
                }`}
              >
                {step.title}
              </AppText>
              <AppText className="text-[12.5px] leading-[18px] text-[#5A6772]">
                {step.detail}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
