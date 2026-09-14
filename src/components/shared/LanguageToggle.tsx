import { useTranslation } from 'react-i18next';
import { toggleLanguage } from '~/lib/i18n';
import { Button } from '~/components/ui/button';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="text-xs font-medium text-muted-foreground hover:text-foreground"
      title={isSpanish ? 'Switch to English' : 'Cambiar a Español'}
    >
      {isSpanish ? 'EN' : 'ES'}
    </Button>
  );
}
