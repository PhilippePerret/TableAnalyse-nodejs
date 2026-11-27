// Thème « Sans style » : la nomenclature d'origine (titre gras, liste)
export default {
    id: 'sans-style'
  , layout: 'list'
  , styles: {
        legend:      {fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', width: 'max-content'}
      , title1:      {fontSize: '60px', fontWeight: 'bold', marginBottom: '50px'}
      , item:        {display: 'flex', alignItems: 'center', gap: '40px', margin: '24px 0'}
      , sign:        {width: '160px', flexShrink: '0', display: 'flex', justifyContent: 'center'}
      , description: {fontSize: '40px', whiteSpace: 'nowrap'}
    }
}
