import type { ReactNode } from 'react'
import type { ClubWithDistance } from '../types/club'
import { formatDistance } from '../lib/haversine'

interface ClubDetailProps {
  club: ClubWithDistance
  onClose: () => void
  onShare: () => void
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: ReactNode
}) {
  return (
    <a
      className="club-detail__social"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
    >
      {children}
    </a>
  )
}

function IconWeb() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3 12h18M12 3c2.5 2.8 3.8 5.8 3.8 9S14.5 18.2 12 21c-2.5-2.8-3.8-5.8-3.8-9S9.5 5.8 12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  )
}

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z"
      />
    </svg>
  )
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.5 9.5H3.7V20h2.8V9.5zM5.1 4A1.65 1.65 0 1 0 5.1 7.3 1.65 1.65 0 0 0 5.1 4zM20.3 13.3c0-2.4-1.3-3.9-3.7-3.9-1.3 0-2.2.6-2.6 1.3V9.5h-2.8c0 .8 0 10.5 0 10.5h2.8v-5.9c0-.3 0-.6.1-.8.3-.6.9-1.2 1.9-1.2 1.3 0 1.9 1 1.9 2.5V20h2.8v-6.7z"
      />
    </svg>
  )
}

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 5 12 5 12 5s-6 0-7.7.3a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9C6 19 12 19 12 19s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8zM10 15.2V8.8L15.5 12 10 15.2z"
      />
    </svg>
  )
}

export function ClubDetail({ club, onClose, onShare }: ClubDetailProps) {
  const socials = [
    club.website ? { href: club.website, label: 'Website', icon: <IconWeb /> } : null,
    club.instagram
      ? { href: club.instagram, label: 'Instagram', icon: <IconInstagram /> }
      : null,
    club.facebook
      ? { href: club.facebook, label: 'Facebook', icon: <IconFacebook /> }
      : null,
    club.linkedin
      ? { href: club.linkedin, label: 'LinkedIn', icon: <IconLinkedIn /> }
      : null,
    club.youtube ? { href: club.youtube, label: 'YouTube', icon: <IconYouTube /> } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; icon: ReactNode }>

  const contactHref = club.public_email
    ? `mailto:${club.public_email}`
    : club.website
      ? club.website
      : socials[0]?.href ?? null

  return (
    <article className="club-detail">
      <header className="club-detail__header">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          ← Back
        </button>
        <button type="button" className="btn btn--ghost" onClick={onShare}>
          Share
        </button>
      </header>

      <h2 className="club-detail__title">{club.club_name}</h2>
      <p className="club-detail__subtitle">
        {club.club_type === 'university' ? 'University Based' : 'Community Based'}
        {club.distanceKm != null ? ` · ${formatDistance(club.distanceKm)}` : ''}
      </p>

      <dl className="club-detail__facts">
        <div>
          <dt>Location</dt>
          <dd>
            {[club.city, club.state, club.country].filter(Boolean).join(', ')}
          </dd>
        </div>
        <div>
          <dt>District</dt>
          <dd>{club.district}</dd>
        </div>
        <div>
          <dt>Zone</dt>
          <dd>{club.zone}</dd>
        </div>
        {club.meeting_day || club.meeting_time || club.meeting_location ? (
          <div>
            <dt>Meetings</dt>
            <dd>
              {[club.meeting_day, club.meeting_time].filter(Boolean).join(' · ')}
              {club.meeting_location ? (
                <>
                  <br />
                  {club.meeting_location}
                </>
              ) : null}
            </dd>
          </div>
        ) : null}
        {club.public_email ? (
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${club.public_email}`}>{club.public_email}</a>
            </dd>
          </div>
        ) : null}
      </dl>

      {club.description ? <p className="club-detail__desc">{club.description}</p> : null}

      {socials.length ? (
        <div className="club-detail__socials" role="list" aria-label="Club links">
          {socials.map((s) => (
            <span key={s.label} role="listitem">
              <SocialIcon href={s.href} label={s.label}>
                {s.icon}
              </SocialIcon>
            </span>
          ))}
        </div>
      ) : null}

      {contactHref ? (
        <a
          className="btn btn--primary club-detail__cta"
          href={contactHref}
          {...(contactHref.startsWith('mailto:')
            ? {}
            : { target: '_blank', rel: 'noopener noreferrer' })}
        >
          Contact club
        </a>
      ) : (
        <p className="muted club-detail__cta-note">
          No public contact channel listed for this club yet.
        </p>
      )}
    </article>
  )
}
