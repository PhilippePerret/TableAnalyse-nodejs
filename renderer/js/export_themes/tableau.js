// Thème « Tableau » : table avec entête (« Marque », « Description »),
// traits verticaux et horizontaux discrets, sans bords arrondis ; titre
// (Titre de premier niveau) fer à gauche, en petites capitales
export default {
    id: 'tableau'
  , layout: 'table'
  , header: true
  , styles: {
        legend:      {fontFamily: 'Helvetica, Arial, sans-serif', color: '#000', width: '1400px'}
      , title1:      {fontSize: '40px', fontWeight: '600', fontVariant: 'small-caps', textAlign: 'left', letterSpacing: '0.04em', marginBottom: '24px'}
      , table:       {borderCollapse: 'collapse', width: '100%'}
      , th:          {fontSize: '32px', fontWeight: '600', textAlign: 'left', padding: '16px 26px', border: '2px solid #bbb', borderBottomWidth: '3px', borderBottomColor: '#777'}
      , td:          {padding: '18px 26px', border: '2px solid #bbb', verticalAlign: 'middle'}
      , sign:        {width: '220px', textAlign: 'center'}
      , description: {fontSize: '36px'}
    }
}
