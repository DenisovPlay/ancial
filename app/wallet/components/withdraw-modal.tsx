'use client';

import Modal from '../../components/modal';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { WalletAccount, WalletGateway, WalletGatewayForm } from '../../lib/api-v2';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Record<string, string> | null;
  accounts: WalletAccount[];
  gatewayConfig: WalletGatewayForm | null;
  selectedGateway: WalletGateway | null;
  withdrawAccountId: number;
  setWithdrawAccountId: (id: number) => void;
  withdrawAmount: string;
  setWithdrawAmount: (v: string) => void;
  withdrawDetails: string;
  setWithdrawDetails: (v: string) => void;
  withdrawLoading: boolean;
  withdrawError: string | null;
  withdrawSuccess: string | null;
  gatewayFormError: string | null;
  gatewayFormLoading: boolean;
  dynamicFieldsData: Record<string, string>;
  setDynamicFieldsData: Dispatch<SetStateAction<Record<string, string>>>;
  handleWithdrawSubmit: (e: FormEvent) => void;
}

/**
 * Модалка «Вывод средств» — вынесена из wallet-content дословно;
 * состояние остаётся в WalletContent.
 */
export function WithdrawModal({
  isOpen,
  onClose,
  lang,
  accounts,
  gatewayConfig,
  selectedGateway,
  withdrawAccountId,
  setWithdrawAccountId,
  withdrawAmount,
  setWithdrawAmount,
  withdrawDetails,
  setWithdrawDetails,
  withdrawLoading,
  withdrawError,
  withdrawSuccess,
  gatewayFormError,
  gatewayFormLoading,
  dynamicFieldsData,
  setDynamicFieldsData,
  handleWithdrawSubmit,
}: WithdrawModalProps) {
  return (
    <>

      {/* 5. MODAL: Withdrawal (Вывод средств) */}
      <Modal isOpen={isOpen} onClose={onClose} title={`${(gatewayConfig?.withdrawal_fields && typeof gatewayConfig.withdrawal_fields !== 'string' ? gatewayConfig.withdrawal_fields.title : undefined) || selectedGateway?.name || (lang?.payment_system || 'платёжную систему')}`} width="sm">
        <div className="flex flex-col gap-3 text-zinc-100">
          {selectedGateway && (
            <div className="flex items-center gap-3 border border-zinc-600/30 p-3 rounded-3xl bg-zinc-900/40">
              <div className="h-12 w-12 p-1 bg-zinc-800 rounded-2xl flex items-center justify-center shrink-0">
                <img alt={selectedGateway.name} src={selectedGateway.image} className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold">{(gatewayConfig?.withdrawal_fields && typeof gatewayConfig.withdrawal_fields !== 'string' ? gatewayConfig.withdrawal_fields.title : undefined) || selectedGateway.name}</span>
                <span className="text-xs text-zinc-400">{lang?.commission_system || 'Комиссия системы'}: {gatewayConfig?.fee_percent ?? selectedGateway.fee_percent}%</span>
              </div>
            </div>
          )}

          {gatewayFormLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-10 h-10 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path>
              </svg>
            </div>
          ) : gatewayFormError ? (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-3xl text-center">
              {gatewayFormError}
            </div>
          ) : withdrawSuccess ? (
            <div className="flex flex-col gap-3 items-center text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">✓</div>
              <span className="text-emerald-400 font-medium text-lg">{withdrawSuccess}</span>
              <button
                type="button"
                onClick={() => onClose()}
                className="w-full mt-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-3xl duration-300 font-medium"
              >
                {lang?.great || 'Отлично'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-1.5 text-left">
              {/* Select account */}
              <div className="flex flex-col w-full">
                <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">{lang?.debit_account || 'Счёт списания'}</span>
                <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                  <select
                    value={withdrawAccountId}
                    onChange={(e) => setWithdrawAccountId(Number(e.target.value))}
                    className="rounded-3xl bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-zinc-200 text-sm"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {lang?.account_num || 'Счёт №'}{acc.id} ({acc.name}) — {acc.balance} ANCI
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Server dynamic fields */}
              {(() => {
                const wf = gatewayConfig?.withdrawal_fields;
                const dynFields = (wf && typeof wf !== 'string' ? wf.fields : undefined) || [];
                if (!Array.isArray(dynFields) || dynFields.length === 0) return (
                <div className="flex flex-col w-full">
                  <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">
                    {selectedGateway?.name.toLowerCase().includes('yoomoney')
                      ? (lang?.yoomoney_wallet_phone || 'Номер кошелька YooMoney / телефона')
                      : (lang?.receiver_details_hint || 'Реквизиты получателя (номер карты/счёта)')}
                  </span>
                  <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                    <input
                      autoComplete="off"
                      type="text"
                      placeholder={selectedGateway?.name.toLowerCase().includes('yoomoney') ? '41001...' : (lang?.details || 'Реквизиты')}
                      value={withdrawDetails}
                      onChange={(e) => setWithdrawDetails(e.target.value)}
                      className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white text-sm"
                      required
                    />
                  </div>
                </div>
                );
                return dynFields.map((f) => {
                  const label = f.label || f.key || '';
                  const key = f.key || 'field';
                  const req = !!f.required;
                  const type = (f.type || '').toLowerCase();

                  if (type === 'select') {
                    const options = Array.isArray(f.options) ? f.options : [];
                    return (
                      <div key={key} className="flex flex-col w-full">
                        <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">{label}</span>
                        <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                          <select
                            required={req}
                            value={dynamicFieldsData[key] || ''}
                            onChange={(e) => setDynamicFieldsData(prev => ({ ...prev, [key]: e.target.value }))}
                            className="rounded-3xl bg-zinc-800/60 w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 text-zinc-200 text-sm"
                          >
                            <option value="" disabled>{lang?.choose || 'Выберите...'}</option>
                            {options.map((o, idx: number) => (
                              <option key={idx} value={o.value ?? ''}>
                                {o.label ?? o.value}
                              </option>
                            ))}
                          </select>
                        </div>
                        {f.hint && <div className="text-xs text-zinc-500 pl-4 mt-1">{f.hint}</div>}
                      </div>
                    );
                  }

                  const inputType = ['text', 'number', 'email', 'tel', 'password'].includes(type) ? type : 'text';
                  return (
                    <div key={key} className="flex flex-col w-full">
                      <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">{label}</span>
                      <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                        <input
                          autoComplete="off"
                          type={inputType}
                          required={req}
                          placeholder={f.placeholder || ''}
                          value={dynamicFieldsData[key] || ''}
                          onChange={(e) => setDynamicFieldsData(prev => ({ ...prev, [key]: e.target.value }))}
                          className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white text-sm"
                        />
                      </div>
                      {f.hint && <div className="text-xs text-zinc-500 pl-4 -mt-2 z-20">{f.hint}</div>}
                    </div>
                  );
                });
              })()}

              {/* Amount */}
              <div className="flex flex-col w-full">
                <span className="text-zinc-400 pl-4 z-20 text-xs lg:text-sm">{lang?.withdraw_amount || 'Сумма вывода'}</span>
                <div className="flex bg-zinc-800/90 rounded-3xl w-full p-1 h-12 -mt-2 lg:-mt-3 z-10 border border-zinc-600/30">
                  <input
                    autoComplete="off"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-transparent w-full focus:ring-0 focus:outline-0 focus:border-0 pl-2 placeholder-zinc-600 text-white text-sm"
                    required
                  />
                </div>
              </div>

              {/* Calculation info */}
              {withdrawAmount && parseFloat(withdrawAmount) > 0 && selectedGateway && (
                <div className="flex flex-col gap-1 p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-3xl text-xs text-zinc-300">
                  <div className="flex justify-between">
                    <span>{lang?.commission || 'Комиссия'} ({gatewayConfig?.fee_percent ?? selectedGateway.fee_percent}%):</span>
                    <span>{((parseFloat(withdrawAmount) * (gatewayConfig?.fee_percent ?? selectedGateway.fee_percent)) / 100).toFixed(2)} ANCI</span>
                  </div>
                  <div className="flex justify-between font-bold text-white pt-1.5 border-t border-zinc-800 text-sm">
                    <span>{lang?.to_receive || 'К получению:'}</span>
                    <span className="text-emerald-400">
                      {Math.max(0, parseFloat(withdrawAmount) - (parseFloat(withdrawAmount) * (gatewayConfig?.fee_percent ?? selectedGateway.fee_percent)) / 100).toFixed(2)} ANCI
                    </span>
                  </div>
                </div>
              )}

              {withdrawError && (
                <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 p-3 rounded-3xl text-center">
                  {withdrawError}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-3xl duration-300 text-sm font-medium border border-zinc-600/30 cursor-pointer"
                >
                  {lang?.cancel || 'Отмена'}
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading || !withdrawAmount}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-3xl duration-300 text-sm font-semibold flex items-center justify-center gap-2 border border-zinc-600/30 cursor-pointer"
                >
                  {withdrawLoading ? (
                    <div className="w-4 h-4 rounded-full animate-spin border-2 border-solid border-white border-t-transparent" />
                  ) : (
                    lang?.withdraw || 'Вывести'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
