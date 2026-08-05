// Public forms index. Forms are only ever reached via direct /forms/[slug] links,
// so the index simply bounces visitors back to the home page.
import { redirect } from 'next/navigation';

export default function FormsIndexPage() {
  redirect('/');
}
