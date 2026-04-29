'use client';

export function ReaderSkeleton(): JSX.Element {
  return (
    <div className="rd-skel" aria-busy="true" aria-label="loading">
      <div className="rd-skel__head" />
      <div className="rd-skel__line rd-skel__line--80" />
      <div className="rd-skel__line rd-skel__line--95" />
      <div className="rd-skel__line rd-skel__line--90" />
      <div className="rd-skel__code" />
      <div className="rd-skel__line rd-skel__line--85" />
      <div className="rd-skel__line rd-skel__line--92" />
    </div>
  );
}
