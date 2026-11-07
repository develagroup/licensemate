import React, { FormEvent, useState } from 'react';
import { ArrowUpRight, Check, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { requestEmailCode, signInWithEmailCode, isBusy, error, clearError } = useAuth();
  const [email, setEmail] = useState(() => sessionStorage.getItem('licensepulse_pending_email') || 'mistervela@gmail.com');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(() => Boolean(sessionStorage.getItem('licensepulse_pending_email')));
  const [notice, setNotice] = useState(() => sessionStorage.getItem('licensepulse_pending_email') ? 'A sign-in code was sent. Check your inbox and spam folder.' : '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    clearError();
    setNotice('');
    if (codeSent) {
      await signInWithEmailCode(email, code).then(() => sessionStorage.removeItem('licensepulse_pending_email')).catch(() => undefined);
    } else {
      await requestEmailCode(email).then(() => {
        sessionStorage.setItem('licensepulse_pending_email', email.trim().toLowerCase());
        setCodeSent(true);
        setNotice('A sign-in code was sent. Check your inbox and spam folder.');
      }).catch(() => undefined);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080a0c] px-5 py-10 text-[#e7e9eb] selection:bg-teal-500/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(20,184,166,0.10),transparent_36%),radial-gradient(ellipse_at_88%_84%,rgba(20,184,166,0.06),transparent_32%)]" />
      <div className="relative grid w-full max-w-[1040px] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101315] shadow-[0_32px_100px_rgba(0,0,0,0.55)] md:min-h-[610px] md:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.07] bg-[#0c0f10] p-10 md:flex lg:p-14">
          <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-teal-300/20 bg-teal-400/10 text-teal-300"><KeyRound className="h-[18px] w-[18px]" /></div>
            <div><div className="text-[15px] font-bold tracking-tight text-white">LicensePulse</div><div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#899395]">Licensing console</div></div>
          </div>

          <div className="relative max-w-md py-12">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/[0.07] px-3 py-1.5 text-[11px] font-semibold text-teal-300"><span className="h-1.5 w-1.5 rounded-full bg-teal-300 shadow-[0_0_10px_#5eead4]" />Administrator workspace</div>
            <h1 className="text-[38px] font-semibold leading-[1.12] tracking-[-0.045em] text-white lg:text-[44px]">Your licensing<br />operation, <span className="text-[#54c7b4]">in sync.</span></h1>
            <p className="mt-5 max-w-sm text-[14px] leading-6 text-[#929b9d]">Manage products, activation seats, and customer licenses from one focused workspace.</p>
            <div className="mt-9 space-y-3">
              {['License and seat management', 'Customer access controls', 'Operational audit trail'].map(item => <div key={item} className="flex items-center gap-3 text-[12px] text-[#b6bdbf]"><span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-teal-300/20 bg-teal-300/[0.08] text-teal-300"><Check className="h-3 w-3" /></span>{item}</div>)}
            </div>
          </div>

          <div className="relative flex items-center justify-between border-t border-white/[0.07] pt-5 text-[10px] text-[#727c7e]"><span>LICENSEPULSE · ADMIN</span><span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-teal-400" />Secure workspace</span></div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12 md:px-10 lg:px-14">
          <form onSubmit={submit} className="w-full max-w-[360px]">
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-teal-300/20 bg-teal-400/10 text-teal-300"><KeyRound className="h-[18px] w-[18px]" /></div>
              <div className="text-[15px] font-bold text-white">LicensePulse</div>
            </div>
            <div className="mb-8">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">Welcome back</div>
              <h2 className="text-[27px] font-semibold tracking-[-0.035em] text-white">Sign in to your account</h2>
              <p className="mt-2 text-[12px] leading-5 text-[#899395]">{codeSent ? `Enter the 6-digit code sent to ${email}.` : 'We’ll email you a one-time sign-in code.'}</p>
            </div>

            {!codeSent ? (
              <>
                <label className="mb-2 block text-[11px] font-semibold text-[#c2c8c9]" htmlFor="login-email">Admin email address</label>
                <div className="relative mb-5">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687274]" />
                  <input id="login-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-11 w-full rounded-lg border border-white/[0.10] bg-[#0b0e10] pl-10 pr-3 text-[12px] text-white outline-none transition placeholder:text-[#626b6d] hover:border-white/[0.16] focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                </div>
              </>
            ) : (
              <>
                <label className="mb-2 block text-[11px] font-semibold text-[#c2c8c9]" htmlFor="login-code">One-time code</label>
                <div className="relative mb-2">
                  <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#687274]" />
                  <input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="h-11 w-full rounded-lg border border-white/[0.10] bg-[#0b0e10] pl-10 pr-3 font-mono text-[15px] tracking-[0.3em] text-white outline-none transition placeholder:text-[#626b6d] hover:border-white/[0.16] focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10" />
                </div>
                <div className="mb-5 flex items-center justify-between">
                  <button type="button" disabled={isBusy} onClick={() => { setCode(''); setNotice(''); clearError(); void requestEmailCode(email).then(() => setNotice('A new sign-in code was sent. Check your inbox and spam folder.')).catch(() => undefined); }} className="text-[11px] font-medium text-teal-300 hover:text-teal-200">Resend code</button>
                  <button type="button" disabled={isBusy} onClick={() => { setCodeSent(false); setCode(''); setNotice(''); sessionStorage.removeItem('licensepulse_pending_email'); clearError(); }} className="text-[11px] font-medium text-[#899395] hover:text-white">Use a different email</button>
                </div>
              </>
            )}
            {error && <p role="alert" className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] p-3 text-[12px] text-rose-300">{error}</p>}
            {notice && <p role="status" className="mb-4 rounded-lg border border-teal-400/20 bg-teal-400/[0.07] p-3 text-[12px] text-teal-200">{notice}</p>}
            <button disabled={isBusy} type="submit" className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#27a892] text-[12px] font-bold text-[#06110f] transition hover:bg-[#35bda7] focus:outline-none focus:ring-2 focus:ring-teal-300/50 focus:ring-offset-2 focus:ring-offset-[#101315] disabled:cursor-wait disabled:opacity-60">
              {isBusy ? (codeSent ? 'Verifying…' : 'Sending code…') : (codeSent ? 'Verify and sign in' : 'Email me a sign-in code')}{!isBusy && <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
            </button>
            <p className="mt-6 flex items-center justify-center gap-2 text-[10px] text-[#737d7f]"><LockKeyhole className="h-3.5 w-3.5" />{codeSent ? 'Code expires in 10 minutes' : 'Passwordless administrator access'}</p>
            <p className="mt-10 text-center text-[10px] text-[#596264]">© {new Date().getFullYear()} LicensePulse</p>
          </form>
        </section>
      </div>
    </main>
  );
};
