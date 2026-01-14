interface HandlePillProps {
    username: string;
    profileUrl: string;
}

export default function HandlePill({ username, profileUrl }: HandlePillProps) {
    return (
        <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-purple-900/60 to-pink-900/60 text-purple-200 border border-purple-700/30 hover:from-purple-800/70 hover:to-pink-800/70 hover:text-white transition-colors cursor-pointer"
        >
            {username}
        </a>
    );
}
