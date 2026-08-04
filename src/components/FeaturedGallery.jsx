import React from 'react';
import { Camera } from 'lucide-react';

/**
 * FeaturedGallery — public landing-page section that renders the media items
 * marked `favorite: true` in the admin media library.
 *
 * Props:
 *   items: Array<{ _id, url, title, folder }>
 */
export default function FeaturedGallery({ items }) {
    if (!items || items.length === 0) return null;

    return (
        <section className="featured-gallery">
            <div className="featured-gallery__container">
                <header className="featured-gallery__header">
                    <span className="featured-gallery__eyebrow">
                        <Camera size={12} aria-hidden="true" /> Gallery
                    </span>
                    <h2 className="featured-gallery__title">Moments from the Forge</h2>
                    <p className="featured-gallery__sub">
                        A look at what we build, ship, and celebrate.
                    </p>
                </header>

                <div className="featured-gallery__grid">
                    {items.map((item, idx) => (
                        <a
                            key={item._id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={
                                'featured-gallery__item ' +
                                (idx === 0 ? 'featured-gallery__item--hero ' : '')
                            }
                            aria-label={item.title || item.folder}
                        >
                            <img src={item.url} alt={item.title || item.folder} loading="lazy" />
                            <span className="featured-gallery__caption">
                                {item.title || item.folder}
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}