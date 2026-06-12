from enum import Enum

# class WordType:
#     def __init__(self, name, color):
#         self.name = name
#         self.color = color



from enum import Enum

class WordType(Enum):
    noun = "noun"
    pronoun = "pronoun"
    verb = "verb"
    adjective = "adjective"
    adverb = "adverb"
    preposition = "preposition"
    conjunction = "conjunction"
    interjection = "interjection"


TYPE_COLOR_MAP = {
    WordType.noun: "#3b82f6",
    WordType.verb: "#22c55e",
    WordType.adjective: "#eab308",
    WordType.adverb: "#a855f7",
    WordType.pronoun: "#ec4899",
    WordType.preposition: "#14b8a6",
    WordType.conjunction: "#f97316",
    WordType.interjection: "#ef4444"
}

# color = TYPE_COLOR_MAP.get(WordType.noun)
