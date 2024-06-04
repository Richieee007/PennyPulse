"use client";

import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";


import {
  cn,
  formUrlQuery,
  formatAmount,
  getAccountTypeColors,
} from "@/lib/utils";

const BankInfo = ({ account, appwriteItemId, type }: BankInfoProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isActive = appwriteItemId === account?.appwriteItemId;

  const handleBankChange = () => {
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: "id",
      value: account?.appwriteItemId,
    });
    router.push(newUrl, { scroll: false });
  };

  const colors = getAccountTypeColors(account?.type as AccountTypes);

  return (
    <div
      onClick={handleBankChange}
      className={cn(`bank-info1 ${colors.bg1}`, {
        "shadow-sm border-green-700": type === "card" && isActive,
        "rounded-xl": type === "card",
        "hover:shadow-sm cursor-pointer": type === "card",
      })}
    >
      <figure
        className={`flex-center h-fit rounded-full bg-green-100 ${colors.lightBg1}`}
      >
        <Image
          src="/icons/connect-bank.svg"
          width={20}
          height={20}
          alt={account.subtype}
          className="m-2 min-w-5"
        />
      </figure>
      <div className="flex w-full flex-1 flex-col justify-center gap-1 bg-green">
        <div className="bank-info_content">
          <h2
            className={`text-16 line-clamp-1 flex-1 font-bold text-black-900 ${colors.title1}`}
          >
            {account.name}
          </h2>
          {type === "full" && (
            <p
              className={`text-12 rounded-full px-3 py-1 font-medium text-black-700 ${colors.subText1} ${colors.lightBg1}`}
            >
              {account.subtype}
            </p>
          )}
        </div>

        <p className={`text-16 font-medium text-black-700 ${colors.subText1}`}>
          {formatAmount(account.currentBalance)}
        </p>
      </div>
    </div>
  );
};

export default BankInfo;
