// Genre catalogue for LUO MUSIC STORE.
// Popular genres first, then other Ugandan modern/urban styles, then Ugandan traditional & cultural styles.
const popularGenres = ['Dancehall', 'Hiphop', 'Gospel', 'Lakubukubu', 'Rap', 'Afrobeat', 'Rumba', 'Reggae', 'Aguma', 'Amapiano', 'RnB'];

const modernGenres = [
  'Kadongo Kamu',
  'Kidandali',
  'Bofena',
  'Bax-Ragga',
  'Lugaflow',
  'Afropop',
  'Afro Fusion',
  'Afro House',
  'Afro Soul',
  'Drill',
  'Trap',
  'Pop',
  'Zouk',
  'Soukous',
  'Taarab',
  'Jazz',
  'Acapella',
  'Instrumental',
];

const traditionalGenres = [
  'Bakisimba',
  'Kadodi',
  'Bwola',
  'Larakaraka',
  'Ekitaguriro',
  'Ekizino',
  'Embaire',
  'Tamenaibuga',
  'Agwara',
  'Edonga',
  'Runyege',
  'Amakondere',
  'Akogo',
];

export const genres = ['All', ...popularGenres, ...modernGenres, ...traditionalGenres];

export const genreGroups = [
  { title: 'Popular Genres', genres: popularGenres },
  { title: 'Modern & Urban Uganda', genres: modernGenres },
  { title: 'Traditional & Cultural Uganda', genres: traditionalGenres },
];

export const uploadGenres = genres.filter(genre => genre !== 'All');

export function isUploadGenre(genre: string | undefined): boolean {
  return typeof genre === 'string' && uploadGenres.includes(genre);
}

export const filterTabs = ['All', 'New Release', 'Top Downloaded', 'This Week', 'This Month', 'This Year'];

export const DEFAULT_COVER_URL = 'https://i.postimg.cc/s2JSyX6w/luomusicstore.jpg';
