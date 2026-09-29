import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { trackProductEvent } from '../services/productAnalyticsApi';

export default function RelatedPyqs({ questions = [], title = 'Related PYQs', empty = true }) {
  if (!questions.length && !empty) return null;
  return (
    <section className="related-pyqs">
      <header><div><span>Archive context</span><h3>{title}</h3></div>{questions.length > 0 && <Link to={`/questions?subjectCode=${encodeURIComponent(questions[0].subjectCode || '')}`}>View all</Link>}</header>
      {questions.length ? (
        <div className="related-pyq-list">
          {questions.slice(0, 6).map((item) => (
            <article key={item._id}>
              <div><small>{[item.year, item.examType, item.marks != null ? `${item.marks} marks` : '', item.similarity != null ? `${item.similarity}% related` : ''].filter(Boolean).join(' · ')}</small><p>{item.questionText}</p></div>
              <Link to={`/questions/${item._id}`} onClick={() => trackProductEvent('related_open', { routeKey: 'related_pyqs', type: 'question' }).catch(() => {})}>Open <ArrowRight size={13} /></Link>
            </article>
          ))}
        </div>
      ) : <p className="related-pyq-empty">No strong related PYQ is indexed yet. Try the subject browser or start a broader practice set.</p>}
    </section>
  );
}
