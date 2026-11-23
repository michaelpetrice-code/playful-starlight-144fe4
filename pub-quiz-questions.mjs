// Each row lists the question, correct answer, then three distractors.
export const questionBank = {
  'General Knowledge': [
    [['How many days are in a week?', 'Seven', 'Five', 'Six', 'Eight'], ['What shape has three sides?', 'Triangle', 'Square', 'Circle', 'Hexagon']],
    [['What does the Roman numeral X represent?', 'Ten', 'Five', 'Fifty', 'One hundred'], ['What is the largest ocean?', 'Pacific', 'Atlantic', 'Indian', 'Arctic']],
    [['What is the SI unit of electric resistance?', 'Ohm', 'Volt', 'Watt', 'Tesla'], ['What is the capital of Slovenia?', 'Ljubljana', 'Zagreb', 'Bratislava', 'Sarajevo']],
  ],
  Music: [
    [['Which instrument has black and white keys?', 'Piano', 'Violin', 'Flute', 'Trumpet']],
    [['Which singer released the album 1989?', 'Taylor Swift', 'Adele', 'Billie Eilish', 'Dua Lipa']],
    [['Who composed The Planets?', 'Gustav Holst', 'Edward Elgar', 'Benjamin Britten', 'Ralph Vaughan Williams']],
  ],
  Sport: [
    [['Which sport uses a shuttlecock?', 'Badminton', 'Tennis', 'Cricket', 'Hockey']],
    [['How many points is a try worth in rugby union?', 'Five', 'Three', 'Four', 'Seven']],
    [['Which country hosted the first FIFA World Cup?', 'Uruguay', 'Brazil', 'France', 'Italy']],
  ],
  History: [
    [['Which ancient civilisation built the pyramids at Giza?', 'Egyptians', 'Vikings', 'Romans', 'Aztecs']],
    [['In which year was the Battle of Hastings?', '1066', '1215', '1492', '1666']],
    [['Who succeeded Elizabeth I as monarch of England?', 'James I', 'Charles I', 'Henry VIII', 'William III']],
  ],
  'TV & Film': [
    [['What is the name of the snowman in Frozen?', 'Olaf', 'Sven', 'Kristoff', 'Hans']],
    [['What is the name of the school in Wednesday?', 'Nevermore Academy', 'Hogwarts', 'Bayside High', 'Rydell High']],
    [['Who directed the film Jaws?', 'Steven Spielberg', 'George Lucas', 'Martin Scorsese', 'Ridley Scott']],
  ],
  Geography: [
    [['What is the capital of Wales?', 'Cardiff', 'Swansea', 'Newport', 'Bangor']],
    [['Which river flows through Paris?', 'Seine', 'Rhine', 'Danube', 'Thames']],
    [['Which country surrounds Lesotho?', 'South Africa', 'Botswana', 'Namibia', 'Zimbabwe']],
  ],
  'Science & Nature': [
    [['Which planet is called the Red Planet?', 'Mars', 'Venus', 'Saturn', 'Mercury']],
    [['Which gas is most abundant in Earth’s atmosphere?', 'Nitrogen', 'Oxygen', 'Argon', 'Carbon dioxide']],
    [['Which element has the chemical symbol W?', 'Tungsten', 'Tin', 'Titanium', 'Zinc']],
  ],
  'Food & Drink': [
    [['What is the main fruit in traditional lemonade?', 'Lemon', 'Orange', 'Apple', 'Pear']],
    [['What is the main ingredient in hummus?', 'Chickpeas', 'Lentils', 'Rice', 'Potatoes']],
    [['Which region gives its name to Parmigiano Reggiano?', 'Emilia-Romagna', 'Sicily', 'Liguria', 'Calabria']],
  ],
  'Books & Comics': [
    [['Who is the bear who loves marmalade sandwiches?', 'Paddington', 'Winnie-the-Pooh', 'Baloo', 'Rupert']],
    [['Who wrote The Hunger Games?', 'Suzanne Collins', 'Veronica Roth', 'J. K. Rowling', 'Rick Riordan']],
    [['Who wrote The Remains of the Day?', 'Kazuo Ishiguro', 'Ian McEwan', 'Julian Barnes', 'Salman Rushdie']],
  ],
  'Gaming & Technology': [
    [['What is Mario’s brother called?', 'Luigi', 'Yoshi', 'Bowser', 'Toad']],
    [['What does CPU stand for?', 'Central Processing Unit', 'Computer Power Utility', 'Central Program Update', 'Core Pixel Unit']],
    [['Who proposed the World Wide Web while working at CERN?', 'Tim Berners-Lee', 'Alan Turing', 'Steve Wozniak', 'Bill Gates']],
  ],
  'Pop Culture': [
    [['What colour is usually associated with Barbie?', 'Pink', 'Brown', 'Green', 'Orange']],
    [['What are BTS fans commonly called?', 'ARMY', 'Directioners', 'Swifties', 'Beliebers']],
    [['Which artist created the Campbell’s Soup Cans series?', 'Andy Warhol', 'Roy Lichtenstein', 'Keith Haring', 'Jackson Pollock']],
  ],
  'Local Knowledge': [
    [['Which city is Coombe Social Club in?', 'Coventry', 'Leeds', 'Bristol', 'York']],
    [['Which university has its main campus near Coventry and is named after a nearby county town?', 'University of Warwick', 'University of Bath', 'University of York', 'University of Exeter']],
    [['Who designed the modern Coventry Cathedral?', 'Basil Spence', 'Christopher Wren', 'Giles Gilbert Scott', 'Edwin Lutyens']],
  ],
  'Family Trivia': [
    [['How many legs does a spider have?', 'Eight', 'Six', 'Ten', 'Four']],
    [['How many squares are on a standard chessboard?', '64', '48', '56', '72']],
    [['What is the highest possible break in standard snooker without a free ball?', '147', '155', '144', '150']],
  ],
  'Puzzles & Riddles': [
    [['What comes next: 2, 4, 6, 8?', '10', '9', '11', '12']],
    [['What comes next: 1, 1, 2, 3, 5, 8?', '13', '11', '12', '16']],
    [['A bat and ball cost £1.10. The bat costs £1 more than the ball. What does the ball cost?', '5p', '10p', '15p', '20p']],
  ],
};

export function questionsFor(topic, difficulty) {
  const levels = Object.entries(questionBank).find(([name]) => name.toLowerCase() === topic.trim().toLowerCase())?.[1];
  if (!levels) return [];
  const rows = difficulty === 'Mix' ? levels.flat() : levels[['Child', 'Teenager', 'Adult'].indexOf(difficulty)] || [];
  return rows.map(([prompt, answer, ...distractors]) => {
    const options = [...distractors];
    const correct = Math.floor(Math.random() * 4);
    options.splice(correct, 0, answer);
    return { prompt, options, correct };
  });
}
