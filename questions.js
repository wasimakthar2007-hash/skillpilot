// questions.js
// You can add as many questions as you want in these arrays.

const aptitudeQuestions = [
    {
        question: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
        options: ["120 metres", "180 metres", "324 metres", "150 metres"],
        answer: 3, // index of the correct option (0-based)
        explanation: "Speed = 60 * (5/18) m/sec = 50/3 m/sec. Length = Speed * Time = (50/3) * 9 = 150 metres."
    },
    {
        question: "A can do a work in 15 days and B in 20 days. If they work on it together for 4 days, then the fraction of the work that is left is:",
        options: ["1/4", "1/10", "7/15", "8/15"],
        answer: 3,
        explanation: "A's 1 day's work = 1/15, B's 1 day's work = 1/20. (A + B)'s 1 day's work = 1/15 + 1/20 = 7/60. (A + B)'s 4 days' work = 4 * 7/60 = 7/15. Work left = 1 - 7/15 = 8/15."
    },
    {
        question: "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?",
        options: ["(1/3)", "(1/8)", "(2/8)", "(1/16)"],
        answer: 1,
        explanation: "This is a simple division series; each number is one-half of the previous number. In other terms to say, the number is divided by 2 successively to get the next result. 1/4 divided by 2 is 1/8."
    },
    {
        question: "Find the greatest number that will divide 43, 91 and 183 so as to leave the same remainder in each case.",
        options: ["4", "7", "9", "13"],
        answer: 0,
        explanation: "Required number = H.C.F. of (91 - 43), (183 - 91) and (183 - 43) = H.C.F. of 48, 92 and 140 = 4."
    }
];

const dsaQuestions = [
    {
        question: "Which data structure is used for implementing recursion?",
        options: ["Queue", "Stack", "Array", "Linked List"],
        answer: 1,
        explanation: "Stacks are used to implement recursion because they follow the LIFO (Last In First Out) principle, which aligns with how recursive function calls are resolved by the system call stack."
    },
    {
        question: "What is the time complexity of searching an element in a binary search tree (BST) in the worst case?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        answer: 2,
        explanation: "In the worst case (e.g., a skewed tree where elements are inserted in sorted order), a BST degenerates into a linked list, so the time complexity for search is O(n)."
    },
    {
        question: "Which of the following sorting algorithms provides the best worst-case performance?",
        options: ["Quick Sort", "Bubble Sort", "Merge Sort", "Selection Sort"],
        answer: 2,
        explanation: "Merge Sort has a worst-case time complexity of O(n log n), while Quick Sort can degrade to O(n^2), and both Bubble and Selection sorts are O(n^2)."
    },
    {
        question: "What is the maximum number of edges in a bipartite graph with n vertices?",
        options: ["n", "n^2 / 4", "n^2 / 2", "n^2"],
        answer: 1,
        explanation: "A bipartite graph with n vertices can be divided into two sets of size n/2. The maximum edges occur when every vertex in one set is connected to every vertex in the other, giving (n/2) * (n/2) = n^2 / 4 edges."
    }
];

// Keep the source files as the canonical question bank. The aptitude flow
// reads this collection automatically and never exposes question IDs.
window.QuestionBank = {
    aptitude: aptitudeQuestions,
    dsa: dsaQuestions
};
