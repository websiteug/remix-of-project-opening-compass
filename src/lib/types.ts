export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  duration: string;
  plays: string;
  gradientFrom: string;
  gradientTo: string;
  genre: string;
  addedDate?: string;
  downloads?: string;
  audioURL?: string;
  coverURL?: string;
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  followers: string;
  gradientFrom: string;
  gradientTo: string;
  trackCount: number;
  bio: string;
  photoURL?: string;
}

export interface MusicVideo {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  views: string;
  gradientFrom: string;
  gradientTo: string;
  duration: string;
  addedDate?: string;
  genre?: string;
  videoURL?: string;
  thumbnailURL?: string;
}
