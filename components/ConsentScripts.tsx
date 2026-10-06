'use client';
// The consent-gated third-party scripts, split into their own chunk: ConsentAnalytics loads this file with
// next/dynamic only AFTER the reader accepted (and after the browser is idle), so Vercel Analytics, Speed Insights and
// the GetYourGuide loader are not part of any page's initial JavaScript, and never download for readers who decline.
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GygAnalytics } from '@/components/GygWidget';

export default function ConsentScripts() {
  return (<><Analytics /><SpeedInsights /><GygAnalytics /></>);
}
