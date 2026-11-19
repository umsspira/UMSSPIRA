import {
  InvalidCorrectionLinkMessage,
  ObservedNoticeView,
} from "@/modules/applications/frontend/components/observed-notice-view";
import { isValidCorrectionTokenFormat } from "@/modules/applications/frontend/constants/correction.constants";

export default function CorrectApplicationPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params?.token;

  if (!isValidCorrectionTokenFormat(token)) {
    return (
      <main className="min-h-screen bg-[#EDE8DE] px-4 py-10">
        <InvalidCorrectionLinkMessage />
      </main>
    );
  }

  return <ObservedNoticeView token={token} />;
}
