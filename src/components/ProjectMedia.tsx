import type { HeroMedia } from '../lib/media'

export function ProjectMedia({ media, title }: { media: HeroMedia; title: string }) {
  if (media.kind === 'image') {
    return (
      <figure className="project-media">
        <img
          src={media.doc.downloadUrl}
          alt={`Media for ${title}`}
          loading="lazy"
          decoding="async"
        />
      </figure>
    )
  }

  if (media.kind === 'video-file') {
    return (
      <figure className="project-media">
        <video
          className="project-media__video"
          controls
          preload="metadata"
          playsInline
          src={media.doc.downloadUrl}
        >
          <a href={media.doc.downloadUrl} target="_blank" rel="noreferrer">
            Download video
          </a>
        </video>
      </figure>
    )
  }

  return (
    <figure className="project-media project-media--embed">
      <div className="project-media__frame">
        <iframe
          src={media.embedUrl}
          title={`Video for ${title}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </figure>
  )
}
