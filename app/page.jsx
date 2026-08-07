import React from 'react';
import HeroSection from '../src/components/HeroSection';
import MagicBento from '../src/components/MagicBento';
import ClubIntro from '../src/components/ClubIntro';
import Footer from '../src/components/Footer';
import connectDB from '@/lib/db';
import Media from '@/lib/models/Media';
import FeaturedGallery from '../src/components/FeaturedGallery';
import AppleCardsCarousel from '../src/components/AppleCardsCarousel';

export const metadata = {
  title: 'KLFORGE - Empowering Student Innovation',
  description: 'KLFORGE is an official technical club of KL University focused on open-source, web development, and AI.',
};

// Always fetch fresh on each request — featured items can change between deploys.
export const dynamic = 'force-dynamic';

async function getFeaturedMedia() {
    try {
        await connectDB();
        const items = await Media.find({ favorite: true, type: 'image' })
            .sort({ createdAt: -1 })
            .limit(12)
            .lean();
        return items.map((m) => ({
            _id: String(m._id),
            url: m.url,
            title: m.title || '',
            folder: m.folder || m.eventName || 'General',
        }));
    } catch {
        return [];
    }
}

async function getCarouselMedia() {
    try {
        await connectDB();
        const items = await Media.find({ favorite: true, type: 'image' })
            .sort({ createdAt: -1 })
            .limit(8)
            .lean();
        return items.map((m) => ({
            src: m.url,
            title: m.title || m.folder || m.eventName || 'Featured',
            category: m.folder || m.eventName || 'KLForge',
            content: (
                <div className="apple-modal__rich">
                    {m.description ? (
                        <p>{m.description}</p>
                    ) : (
                        <p>
                            A standout moment from the {m.folder || m.eventName || 'KLForge'} collection,
                            curated by the team for the landing page.
                        </p>
                    )}
                    <a
                        className="apple-modal__cta"
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View full size →
                    </a>
                </div>
            ),
        }));
    } catch {
        return [];
    }
}

// Fallback set so the carousel always shows on a fresh deploy with no favorites yet.
const FALLBACK_CARDS = [
    {
        src: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=80&w=1600&auto=format&fit=crop',
        title: 'AI that builds with you',
        category: 'Artificial Intelligence',
        content: (
            <div className="apple-modal__rich">
                <p>
                    We prototype, fine-tune, and ship AI tools for the club and the broader KLEF
                    community — from chatbots to vision pipelines.
                </p>
                <p>
                    Expect hands-on workshops, open-source releases, and a few late-night
                    hackathons that always pay off.
                </p>
            </div>
        ),
    },
    {
        src: 'https://images.unsplash.com/photo-1531554694128-c4c6665f59c2?q=80&w=1600&auto=format&fit=crop',
        title: 'Tools that compound',
        category: 'Productivity',
        content: (
            <div className="apple-modal__rich">
                <p>
                    Internal dashboards, deploy pipelines, scheduling bots — the unglamorous
                    infrastructure that keeps a club running smoothly.
                </p>
            </div>
        ),
    },
    {
        src: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1600&auto=format&fit=crop',
        title: 'Open source, by default',
        category: 'Engineering',
        content: (
            <div className="apple-modal__rich">
                <p>
                    Every project the club ships lives in the open. We maintain our repos, take
                    PRs from newcomers, and document what we learn along the way.
                </p>
            </div>
        ),
    },
    {
        src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop',
        title: 'A community that ships',
        category: 'People',
        content: (
            <div className="apple-modal__rich">
                <p>
                    KLForge is the people behind the pull requests — students across departments
                    who meet, build, and grow together.
                </p>
            </div>
        ),
    },
    {
        src: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop',
        title: 'Hardware that talks',
        category: 'IoT & Robotics',
        content: (
            <div className="apple-modal__rich">
                <p>
                    From sensor rigs to autonomous bots — KLForge members love things that
                    blink, move, and listen.
                </p>
            </div>
        ),
    },
    {
        src: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=1600&auto=format&fit=crop',
        title: 'Designed for clarity',
        category: 'Design',
        content: (
            <div className="apple-modal__rich">
                <p>
                    Brand systems, event posters, UI kits — design isn't an afterthought, it's
                    a first-class club output.
                </p>
            </div>
        ),
    },
];

export default async function HomePage() {
    const featured = await getFeaturedMedia();
    const carouselSource = await getCarouselMedia();
    const carouselItems = carouselSource.length > 0 ? carouselSource : FALLBACK_CARDS;

    return (
        <div>
            <HeroSection />
            <div className="hero-spacer" />
            {/* <AppleCardsCarousel
                items={carouselItems}
                eyebrow="Spotlight"
                title="What we build"
                sub="A glimpse of the work, moments, and ideas that move KLForge forward."
            /> */}
            <ClubIntro>
                <section className="bento-wrapper">
                    <MagicBento
                        textAutoHide={true}
                        enableStars
                        enableSpotlight={false}
                        enableBorderGlow={false}
                        enableTilt={false}
                        enableMagnetism={false}
                        clickEffect
                        spotlightRadius={400}
                        particleCount={12}
                        glowColor="255, 255, 255"
                        disableAnimations={false}
                    />
                </section>
            </ClubIntro>
            <FeaturedGallery items={featured} />
            <div className="footer-separator" />
            <Footer />
        </div>
    );
}