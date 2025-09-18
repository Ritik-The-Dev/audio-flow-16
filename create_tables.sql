-- Enable RLS (Row Level Security) on all tables by default
-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id)
);

-- Songs table - stores cached song data
CREATE TABLE IF NOT EXISTS public.songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT,
    image TEXT,
    media_url TEXT NOT NULL,
    duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Playlists table
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Playlist songs junction table
CREATE TABLE IF NOT EXISTS public.playlist_songs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    playlist_id UUID REFERENCES public.playlists ON DELETE CASCADE NOT NULL,
    song_id TEXT REFERENCES public.songs ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(playlist_id, song_id)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    song_id TEXT REFERENCES public.songs ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, song_id)
);

-- Listening history table
CREATE TABLE IF NOT EXISTS public.listening_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    song_id TEXT REFERENCES public.songs ON DELETE CASCADE NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    play_duration INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_history ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Playlists policies
CREATE POLICY "Users can view their own playlists" ON public.playlists
    FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert their own playlists" ON public.playlists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists" ON public.playlists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists" ON public.playlists
    FOR DELETE USING (auth.uid() = user_id);

-- Playlist songs policies
CREATE POLICY "Users can view playlist songs for their playlists or public playlists" ON public.playlist_songs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE playlists.id = playlist_songs.playlist_id
            AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
        )
    );

CREATE POLICY "Users can manage songs in their own playlists" ON public.playlist_songs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE playlists.id = playlist_songs.playlist_id
            AND playlists.user_id = auth.uid()
        )
    );

-- Favorites policies
CREATE POLICY "Users can view their own favorites" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" ON public.favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" ON public.favorites
    FOR DELETE USING (auth.uid() = user_id);

-- Listening history policies
CREATE POLICY "Users can view their own listening history" ON public.listening_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own listening history" ON public.listening_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Songs policies - allow everyone to read, only authenticated users to insert
CREATE POLICY "Songs are viewable by everyone" ON public.songs
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert songs" ON public.songs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();